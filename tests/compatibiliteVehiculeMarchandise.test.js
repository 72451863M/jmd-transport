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
  usersDB["u_transp"] = { _id: "u_transp", statsFiabilite: {}, kyc: { statutGlobal: "valide" } };

  vehiculesDB["veh_camion"] = { _id: "veh_camion", proprietaire: "u_transp", type: "camion", actif: true };
  vehiculesDB["veh_frigo"] = { _id: "veh_frigo", proprietaire: "u_transp", type: "frigorifique", actif: true };

  const userReq = { _id: "u_transp", role: "transporteur", kyc: { statutGlobal: "valide" } };

  // Test 1 : produits réfrigérés + véhicule camion standard -> refusé
  livraisonsDB["liv1"] = makeLivraisonDoc({ _id: "liv1", client: "u_client", transporteur: null, statut: "en_attente", typeMarchandise: "produits_refrigeres", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  let req = { params: { id: "liv1" }, body: { vehiculeId: "veh_camion" }, user: userReq };
  let res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 400, "Produits réfrigérés + camion standard -> refusé (400)");
  assert(res._json.message.includes("frigorifique"), "Le message explique qu'un véhicule frigorifique est requis");
  assert(livraisonsDB["liv1"].statut === "en_attente", "Le statut reste en_attente après le refus");

  // Test 2 : produits réfrigérés + véhicule frigorifique -> accepté
  livraisonsDB["liv2"] = makeLivraisonDoc({ _id: "liv2", client: "u_client", transporteur: null, statut: "en_attente", typeMarchandise: "produits_refrigeres", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv2" }, body: { vehiculeId: "veh_frigo" }, user: userReq };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 200, "Produits réfrigérés + véhicule frigorifique -> accepté (200)");
  assert(livraisonsDB["liv2"].vehiculeUtilise === "veh_frigo", "Le véhicule frigorifique est bien enregistré");

  // Test 3 : produits réfrigérés SANS choisir de véhicule du tout -> refusé
  livraisonsDB["liv3"] = makeLivraisonDoc({ _id: "liv3", client: "u_client", transporteur: null, statut: "en_attente", typeMarchandise: "produits_refrigeres", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv3" }, body: {}, user: userReq };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 400, "Produits réfrigérés sans véhicule choisi -> refusé (l'exigence n'est pas contournable)");

  // Test 4 : colis standard (aucune contrainte) accepté sans véhicule
  livraisonsDB["liv4"] = makeLivraisonDoc({ _id: "liv4", client: "u_client", transporteur: null, statut: "en_attente", typeMarchandise: "colis", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv4" }, body: {}, user: userReq };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 200, "Colis standard accepté sans véhicule choisi -> 200 (non-régression)");

  // Test 5 : livraison créée AVANT ce module (typeMarchandise absent/undefined) -> non bloquée
  livraisonsDB["liv5"] = makeLivraisonDoc({ _id: "liv5", client: "u_client", transporteur: null, statut: "en_attente", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv5" }, body: {}, user: userReq };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 200, "Une livraison sans typeMarchandise défini (données anciennes) n'est pas bloquée");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
