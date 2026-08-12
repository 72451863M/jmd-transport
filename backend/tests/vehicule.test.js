const mock = require("mock-require");

let vehiculesDB = {};
let livraisonsDB = {};
let counter = 1;

function makeVehiculeDoc(data) {
  const id = "veh_" + counter++;
  const doc = Object.assign({ _id: id }, data, {
    save: async function () { vehiculesDB[id] = doc; return doc; },
    deleteOne: async function () { delete vehiculesDB[id]; },
  });
  vehiculesDB[id] = doc;
  return doc;
}

const FakeVehicule = {
  create: async (data) => makeVehiculeDoc(data),
  findOne: async (filter) =>
    Object.values(vehiculesDB).find(
      (v) => String(v.proprietaire) === String(filter.proprietaire) && v.immatriculation === filter.immatriculation
    ) || null,
  findById: async (id) => vehiculesDB[id] || null,
  find: (filter = {}) => {
    let list = Object.values(vehiculesDB);
    if (filter.proprietaire) list = list.filter((v) => String(v.proprietaire) === String(filter.proprietaire));
    const wrapper = Promise.resolve(list);
    wrapper.sort = () => wrapper;
    return wrapper;
  },
};

const FakeLivraison = {
  findOne: async (filter) => {
    let list = Object.values(livraisonsDB);
    if (filter.vehiculeUtilise) list = list.filter((l) => String(l.vehiculeUtilise) === String(filter.vehiculeUtilise));
    if (filter.statut?.$in) list = list.filter((l) => filter.statut.$in.includes(l.statut));
    return list[0] || null;
  },
};

mock("../models/Vehicule", FakeVehicule);
mock("../models/Livraison", FakeLivraison);

const controllerPath = require.resolve("../controllers/vehiculeController");
delete require.cache[controllerPath];
const { ajouterVehicule, getMesVehicules, modifierVehicule, supprimerVehicule } = require("../controllers/vehiculeController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : champs obligatoires manquants
  let req = { body: { immatriculation: "AB-123-ML" }, user: { _id: "u_transp1" } };
  let res = fakeRes();
  await ajouterVehicule(req, res);
  assert(res._status === 400, "Refus si type ou capacité manquants");

  // Test 2 : ajout valide
  req = { body: { immatriculation: "ab-123-ml", type: "camionnette", capaciteKg: 1500, nomChauffeur: "Boubacar Traoré" }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await ajouterVehicule(req, res);
  assert(res._status === 201, "Ajout d'un véhicule -> 201");
  assert(res._json.immatriculation === "AB-123-ML", "Immatriculation normalisée en majuscules");
  const idVehicule = res._json._id;

  // Test 3 : refus de doublon d'immatriculation pour le même propriétaire
  req = { body: { immatriculation: "AB-123-ML", type: "camion", capaciteKg: 3000 }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await ajouterVehicule(req, res);
  assert(res._status === 400, "Refus d'ajouter deux fois la même immatriculation pour le même transporteur");

  // Test 4 : un autre transporteur PEUT utiliser la même immatriculation (erreur de saisie possible, pas d'unicité globale)
  req = { body: { immatriculation: "AB-123-ML", type: "moto", capaciteKg: 50 }, user: { _id: "u_transp2" } };
  res = fakeRes();
  await ajouterVehicule(req, res);
  assert(res._status === 201, "Un autre transporteur peut utiliser la même immatriculation (pas d'unicité globale)");

  // Test 5 : liste des véhicules d'un transporteur (isolée des autres)
  req = { user: { _id: "u_transp1" } };
  res = fakeRes();
  await getMesVehicules(req, res);
  assert(res._json.length === 1, "u_transp1 ne voit que son propre véhicule");

  // Test 6 : modification par le propriétaire
  req = { params: { id: idVehicule }, body: { nomChauffeur: "Sekou Koné" }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await modifierVehicule(req, res);
  assert(res._status === 200 && res._json.nomChauffeur === "Sekou Koné", "Modification du chauffeur affecté -> 200");

  // Test 7 : un tiers ne peut pas modifier le véhicule d'un autre
  req = { params: { id: idVehicule }, body: { nomChauffeur: "Intrus" }, user: { _id: "u_transp2" } };
  res = fakeRes();
  await modifierVehicule(req, res);
  assert(res._status === 403, "Un tiers ne peut pas modifier le véhicule d'un autre transporteur");

  // Test 8 : suppression refusée si le véhicule est utilisé sur une mission en cours
  livraisonsDB["liv1"] = { _id: "liv1", vehiculeUtilise: idVehicule, statut: "en_cours" };
  req = { params: { id: idVehicule }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await supprimerVehicule(req, res);
  assert(res._status === 400, "Suppression refusée si le véhicule est utilisé sur une mission en cours");
  assert(vehiculesDB[idVehicule] !== undefined, "Le véhicule n'a pas été supprimé");

  // Test 9 : suppression acceptée une fois la mission terminée
  livraisonsDB["liv1"].statut = "livree";
  res = fakeRes();
  await supprimerVehicule(req, res);
  assert(res._status === 200, "Suppression acceptée une fois la mission terminée");
  assert(vehiculesDB[idVehicule] === undefined, "Le véhicule a bien été retiré de la flotte");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
