const mock = require("mock-require");

let groupesDB = {};
let livraisonsDB = {};
let counter = 1;

function makeGroupeDoc(data) {
  const id = "grp_" + counter++;
  const doc = Object.assign({ _id: id, demandes: [] }, data, {
    save: async function () { groupesDB[id] = doc; return doc; },
  });
  groupesDB[id] = doc;
  return doc;
}

function makeLivraisonDoc(data) {
  const doc = Object.assign({
    save: async function () { livraisonsDB[doc._id] = doc; return doc; },
  }, data);
  livraisonsDB[doc._id] = doc;
  return doc;
}

function buildQuery(getResult) {
  const wrapper = {};
  wrapper.then = (resolve, reject) => Promise.resolve(getResult()).then(resolve, reject);
  return wrapper;
}

const FakeGroupeCollaboratif = {
  create: async (data) => makeGroupeDoc(data),
  find: (filtre = {}) => {
    let list = Object.values(groupesDB);
    if (filtre.statut) list = list.filter((g) => g.statut === filtre.statut);
    return list;
  },
  findById: (id) => buildQuery(() => groupesDB[id] || null),
};

const FakeLivraison = {
  find: (filtre = {}) => {
    if (filtre._id?.$in) {
      return Promise.resolve(filtre._id.$in.map((id) => livraisonsDB[id]).filter(Boolean));
    }
    return Promise.resolve(Object.values(livraisonsDB));
  },
  findById: (id) => buildQuery(() => livraisonsDB[id] || null),
};

mock("../models/GroupeCollaboratif", FakeGroupeCollaboratif);
mock("../models/Livraison", FakeLivraison);

const controllerPath = require.resolve("../controllers/collaboratifController");
delete require.cache[controllerPath];
const { tenterRegroupement, getMonGroupe, getTousLesGroupes } = require("../controllers/collaboratifController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : demande non éligible -> aucun groupe créé
  const demandeNonEligible = makeLivraisonDoc({
    _id: "liv_non_elig", client: "u1", eligibleCollaboratif: false,
    adresseDepart: { label: "Bamako" }, adresseArrivee: { label: "Sikasso" },
    distanceKm: 10, poidsKg: 30, prix: 3000,
  });
  await tenterRegroupement(demandeNonEligible);
  assert(Object.keys(groupesDB).length === 0, "Une demande non éligible ne crée aucun groupe");

  // Test 2 : première demande éligible -> crée un nouveau groupe
  const demande1 = makeLivraisonDoc({
    _id: "liv1", client: "u1", eligibleCollaboratif: true,
    adresseDepart: { label: "Bamako" }, adresseArrivee: { label: "Sikasso" },
    distanceKm: 10, poidsKg: 30, prix: 3000, typeMarchandise: "colis",
  });
  await tenterRegroupement(demande1);
  assert(Object.keys(groupesDB).length === 1, "Première demande éligible crée un nouveau groupe ouvert");
  const idGroupe = Object.keys(groupesDB)[0];
  assert(groupesDB[idGroupe].demandes.length === 1, "Le groupe contient bien la demande");
  assert(demande1.economieCollaborative === 0, "Seul dans le groupe, aucune économie pour l'instant (0)");

  // Test 3 : deuxième demande compatible -> rejoint le MÊME groupe (pas de nouveau)
  const demande2 = makeLivraisonDoc({
    _id: "liv2", client: "u2", eligibleCollaboratif: true,
    adresseDepart: { label: "Bamako" }, adresseArrivee: { label: "Sikasso" },
    distanceKm: 10, poidsKg: 30, prix: 3000, typeMarchandise: "colis",
  });
  await tenterRegroupement(demande2);
  assert(Object.keys(groupesDB).length === 1, "Toujours un seul groupe (la 2e demande a rejoint le 1er, pas créé de nouveau)");
  assert(groupesDB[idGroupe].demandes.length === 2, "Le groupe contient maintenant les 2 demandes");
  assert(demande1.economieCollaborative > 0, "La 1ère demande bénéficie maintenant d'une économie (recalculée après le regroupement)");
  assert(demande2.economieCollaborative > 0, "La 2e demande bénéficie aussi d'une économie");
  assert(demande1.economieCollaborative === demande2.economieCollaborative, "Poids identiques -> économies identiques");

  // Test 4 : troisième demande incompatible (trajet différent) -> nouveau groupe séparé
  const demande3 = makeLivraisonDoc({
    _id: "liv3", client: "u3", eligibleCollaboratif: true,
    adresseDepart: { label: "Bamako" }, adresseArrivee: { label: "Kayes" },
    distanceKm: 20, poidsKg: 40, prix: 4000, typeMarchandise: "colis",
  });
  await tenterRegroupement(demande3);
  assert(Object.keys(groupesDB).length === 2, "Trajet différent -> un second groupe distinct est créé");

  // Test 5 : getMonGroupe — l'auteur peut consulter, avec confidentialité respectée
  let req = { params: { id: "liv1" }, user: { _id: "u1", role: "client" } };
  let res = fakeRes();
  await getMonGroupe(req, res);
  assert(res._status === 200, "L'auteur de la demande peut consulter son groupe -> 200");
  assert(res._json.autresLivraisons.length === 1, "Voit bien 1 autre membre dans le groupe");
  assert(res._json.autresLivraisons[0].villeLivraison === "Sikasso", "Voit la ville de livraison de l'autre membre");
  assert(JSON.stringify(res._json).includes("u2") === false || res._json.autresLivraisons[0].client === undefined, "N'expose aucune donnée d'identité de l'autre client");

  // Test 6 : un tiers ne peut pas consulter le groupe d'un autre
  req = { params: { id: "liv1" }, user: { _id: "u_intrus", role: "client" } };
  res = fakeRes();
  await getMonGroupe(req, res);
  assert(res._status === 403, "Un tiers ne peut pas consulter le groupe d'une autre demande");

  // Test 7 : une demande non regroupée -> 404 clair (pas d'erreur générique)
  const demandeSeule = makeLivraisonDoc({ _id: "liv_seule", client: "u4", eligibleCollaboratif: false, groupeCollaboratif: null });
  req = { params: { id: "liv_seule" }, user: { _id: "u4", role: "client" } };
  res = fakeRes();
  await getMonGroupe(req, res);
  assert(res._status === 404, "Une demande qui n'a rejoint aucun groupe -> 404 explicite");

  // Test 8 : vue admin de tous les groupes
  req = {};
  res = fakeRes();
  await getTousLesGroupes(req, res);
  assert(res._json.length === 2, "L'admin voit tous les groupes créés (2)");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
