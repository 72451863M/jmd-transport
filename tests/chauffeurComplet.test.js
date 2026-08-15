const mock = require("mock-require");

let chauffeursDB = {};
let livraisonsDB = {};
let counter = 1;

function makeChauffeurDoc(data) {
  const id = "chf_" + counter++;
  const doc = Object.assign(
    { _id: id, actif: true, disponibilite: "disponible", statsMissions: { missionsCompletees: 0, sommeNotes: 0, nbNotes: 0 }, certificats: [] },
    data,
    {
      save: async function () { chauffeursDB[id] = doc; return doc; },
      deleteOne: async function () { delete chauffeursDB[id]; },
    }
  );
  chauffeursDB[id] = doc;
  return doc;
}

function buildListQuery(list) {
  const wrapper = {};
  wrapper.sort = () => wrapper;
  wrapper.then = (resolve, reject) => Promise.resolve(list).then(resolve, reject);
  return wrapper;
}

const FakeChauffeur = {
  create: async (data) => makeChauffeurDoc(data),
  findById: async (id) => chauffeursDB[id] || null,
  find: (filtre = {}) => {
    let list = Object.values(chauffeursDB);
    if (filtre.proprietaire) list = list.filter((c) => String(c.proprietaire) === String(filtre.proprietaire));
    if (filtre.chauffeurUtilise) list = [];
    return buildListQuery(list);
  },
};

const FakeLivraison = {
  find: (filtre = {}) => {
    let list = Object.values(livraisonsDB);
    if (filtre.chauffeurUtilise) list = list.filter((l) => String(l.chauffeurUtilise) === String(filtre.chauffeurUtilise));
    return buildListQuery(list);
  },
};

mock("../models/Chauffeur", FakeChauffeur);
mock("../models/Vehicule", {});
mock("../models/Livraison", FakeLivraison);
mock("../models/JournalAudit", { create: async () => ({}) });

const controllerPath = require.resolve("../controllers/chauffeurController");
delete require.cache[controllerPath];
const { ajouterChauffeur, modifierChauffeur, getHistoriqueMissions } = require("../controllers/chauffeurController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : catégorie de permis invalide refusée
  let req = { body: { nom: "Ali Coulibaly", telephone: "+22376112233", categoriePermis: "Z" }, user: { _id: "u_transp1" } };
  let res = fakeRes();
  await ajouterChauffeur(req, res);
  assert(res._status === 400, "Catégorie de permis invalide -> 400");

  // Test 2 : ajout complet avec permis, date d'expiration, certificats
  req = {
    body: {
      nom: "Ali Coulibaly", telephone: "+22376112233", categoriePermis: "C",
      dateExpirationPermis: "2027-06-01", certificats: [{ nom: "Transport matières dangereuses", dateExpiration: "2027-01-01" }],
    },
    user: { _id: "u_transp1" },
  };
  res = fakeRes();
  await ajouterChauffeur(req, res);
  assert(res._status === 201, "Ajout avec permis complet et certificats -> 201");
  assert(res._json.categoriePermis === "C", "Catégorie de permis correctement enregistrée");
  assert(res._json.certificats.length === 1, "Le certificat est correctement enregistré");
  assert(res._json.disponibilite === "disponible", "Disponibilité par défaut = disponible");
  const idChauffeur = res._json._id;

  // Test 3 : modification de la disponibilité (ex. congé)
  req = { params: { id: idChauffeur }, body: { disponibilite: "indisponible" }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await modifierChauffeur(req, res);
  assert(res._status === 200 && res._json.disponibilite === "indisponible", "Le transporteur peut marquer son chauffeur indisponible manuellement");

  // Test 4 : disponibilité invalide refusée
  req = { params: { id: idChauffeur }, body: { disponibilite: "en_vacances" }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await modifierChauffeur(req, res);
  assert(res._status === 400, "Valeur de disponibilité invalide -> 400");

  // Test 5 : historique des missions — vide au départ
  req = { params: { id: idChauffeur }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await getHistoriqueMissions(req, res);
  assert(res._status === 200, "Consultation de l'historique -> 200");
  assert(res._json.missions.length === 0, "Aucune mission au départ");
  assert(res._json.chauffeur.noteMoyenne === null, "Pas de note moyenne tant qu'aucune évaluation n'existe");

  // Test 6 : historique avec des missions et des notes déjà accumulées
  chauffeursDB[idChauffeur].statsMissions = { missionsCompletees: 3, sommeNotes: 13, nbNotes: 3 };
  livraisonsDB["liv1"] = { _id: "liv1", chauffeurUtilise: idChauffeur, adresseDepart: { label: "A" }, adresseArrivee: { label: "B" }, statut: "livree", prix: 2000, createdAt: new Date() };
  req = { params: { id: idChauffeur }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await getHistoriqueMissions(req, res);
  assert(res._json.missions.length === 1, "La mission apparaît bien dans l'historique");
  assert(res._json.chauffeur.missionsCompletees === 3, "Le nombre de missions complétées est correctement remonté");
  assert(res._json.chauffeur.noteMoyenne === 4.3, `Note moyenne correctement calculée (13/3 ≈ 4.3), obtenu ${res._json.chauffeur.noteMoyenne}`);

  // Test 7 : un tiers ne peut pas consulter l'historique d'un chauffeur qui n'est pas le sien
  req = { params: { id: idChauffeur }, user: { _id: "u_intrus" } };
  res = fakeRes();
  await getHistoriqueMissions(req, res);
  assert(res._status === 403, "Un tiers ne peut pas consulter l'historique d'un chauffeur d'un autre transporteur");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
