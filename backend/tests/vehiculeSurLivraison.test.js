const mock = require("mock-require");

let livraisonsDB = {};
let usersDB = {};
let vehiculesDB = {};

function makeLivraisonDoc(data) {
  const doc = Object.assign({
    toObject() { return Object.assign({}, doc); },
    save: async function () { livraisonsDB[doc._id] = doc; return doc; },
  }, data);
  return doc;
}

const FakeLivraison = { findById: async (id) => livraisonsDB[id] || null };
const FakeUser = {
  findByIdAndUpdate: async (id) => usersDB[id] || null,
  findById: async (id) => usersDB[id] || null,
};
const FakeVehicule = { findById: async (id) => vehiculesDB[id] || null };
const FakeDocument = { create: async () => ({}) };
const FakeNotification = { create: async () => ({}) };

mock("../models/Livraison", FakeLivraison);
mock("../models/User", FakeUser);
mock("../models/Vehicule", FakeVehicule);
mock("../models/Document", FakeDocument);
mock("../models/Notification", FakeNotification);

const controllerPath = require.resolve("../controllers/livraisonController");
delete require.cache[controllerPath];
const { accepterLivraison } = require("../controllers/livraisonController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  usersDB["u_client"] = { _id: "u_client", nom: "Client", telephone: "x" };
  usersDB["u_transp1"] = { _id: "u_transp1", statsFiabilite: {}, kyc: { statutGlobal: "valide" } };
  usersDB["u_transp2"] = { _id: "u_transp2", statsFiabilite: {}, kyc: { statutGlobal: "valide" } };

  vehiculesDB["veh1"] = { _id: "veh1", proprietaire: "u_transp1", immatriculation: "AB-123-ML", actif: true, type: "camionnette", capaciteKg: 1500, nomChauffeur: "Boubacar" };
  vehiculesDB["veh2_inactif"] = { _id: "veh2_inactif", proprietaire: "u_transp1", immatriculation: "CD-456-ML", actif: false };

  // Test 1 : acceptation avec un véhicule de sa propre flotte
  livraisonsDB["liv1"] = makeLivraisonDoc({ _id: "liv1", client: "u_client", transporteur: null, statut: "en_attente", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  let req = { params: { id: "liv1" }, body: { vehiculeId: "veh1" }, user: { _id: "u_transp1", role: "transporteur", kyc: { statutGlobal: "valide" } } };
  let res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 200, "Acceptation avec véhicule de sa flotte -> 200");
  assert(livraisonsDB["liv1"].vehiculeUtilise === "veh1", "Le véhicule choisi est bien enregistré sur la livraison");

  // Test 2 : refus si le véhicule appartient à un autre transporteur
  livraisonsDB["liv2"] = makeLivraisonDoc({ _id: "liv2", client: "u_client", transporteur: null, statut: "en_attente", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv2" }, body: { vehiculeId: "veh1" }, user: { _id: "u_transp2", role: "transporteur", kyc: { statutGlobal: "valide" } } };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 403, "Refus si le véhicule choisi n'appartient pas au transporteur");

  // Test 3 : refus si le véhicule choisi est désactivé
  req = { params: { id: "liv2" }, body: { vehiculeId: "veh2_inactif" }, user: { _id: "u_transp1", role: "transporteur", kyc: { statutGlobal: "valide" } } };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 400, "Refus si le véhicule choisi est désactivé");

  // Test 4 : acceptation sans véhicule reste possible (transporteur indépendant sans flotte)
  livraisonsDB["liv3"] = makeLivraisonDoc({ _id: "liv3", client: "u_client", transporteur: null, statut: "en_attente", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv3" }, body: {}, user: { _id: "u_transp1", role: "transporteur", kyc: { statutGlobal: "valide" } } };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 200, "Acceptation sans choisir de véhicule reste possible -> 200");
  assert(!livraisonsDB["liv3"].vehiculeUtilise, "Aucun véhicule enregistré si non choisi");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
