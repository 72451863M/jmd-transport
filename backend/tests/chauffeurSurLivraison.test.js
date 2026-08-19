const mock = require("mock-require");

let livraisonsDB = {};
let usersDB = {};
let vehiculesDB = {};
let chauffeursDB = {};

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
const FakeChauffeur = {
  findById: async (id) => chauffeursDB[id] || null,
  findByIdAndUpdate: async (id, update) => {
    const c = chauffeursDB[id];
    if (!c) return null;
    if (update.$inc) {
      for (const [path, amount] of Object.entries(update.$inc)) {
        const parts = path.split(".");
        let obj = c;
        for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
        obj[parts[parts.length - 1]] = (obj[parts[parts.length - 1]] || 0) + amount;
      }
    }
    return c;
  },
};
const FakeDocument = { create: async () => ({}) };
const FakeNotification = { create: async () => ({}) };

mock("../models/Livraison", FakeLivraison);
mock("../models/User", FakeUser);
mock("../models/Vehicule", FakeVehicule);
mock("../models/Chauffeur", FakeChauffeur);
mock("../models/Document", FakeDocument);
mock("../models/Notification", FakeNotification);

const controllerPath = require.resolve("../controllers/livraisonController");
delete require.cache[controllerPath];
const { accepterLivraison, livrerAvecPreuve, evaluerLivraison } = require("../controllers/livraisonController");

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
  const userReq = { _id: "u_transp", role: "transporteur", kyc: { statutGlobal: "valide" } };

  chauffeursDB["chf_dispo"] = {
    _id: "chf_dispo", proprietaire: "u_transp", actif: true, disponibilite: "disponible",
    statsMissions: { missionsCompletees: 0, sommeNotes: 0, nbNotes: 0 },
    save: async function () { chauffeursDB[this._id] = this; return this; },
  };
  chauffeursDB["chf_en_mission"] = {
    _id: "chf_en_mission", proprietaire: "u_transp", actif: true, disponibilite: "en_mission",
    statsMissions: { missionsCompletees: 0, sommeNotes: 0, nbNotes: 0 },
    save: async function () { chauffeursDB[this._id] = this; return this; },
  };

  // Test 1 : accepter avec un chauffeur disponible -> succès, chauffeur passe en_mission
  livraisonsDB["liv1"] = makeLivraisonDoc({ _id: "liv1", client: "u_client", transporteur: null, statut: "en_attente", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  let req = { params: { id: "liv1" }, body: { chauffeurId: "chf_dispo" }, user: userReq };
  let res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 200, "Acceptation avec chauffeur disponible -> 200");
  assert(livraisonsDB["liv1"].chauffeurUtilise === "chf_dispo", "Le chauffeur choisi est bien enregistré sur la livraison");
  assert(chauffeursDB["chf_dispo"].disponibilite === "en_mission", "Le chauffeur passe automatiquement 'en_mission'");

  // Test 2 : refus si le chauffeur est déjà en mission
  livraisonsDB["liv2"] = makeLivraisonDoc({ _id: "liv2", client: "u_client", transporteur: null, statut: "en_attente", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv2" }, body: { chauffeurId: "chf_en_mission" }, user: userReq };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 400, "Refus si le chauffeur choisi est déjà en mission");

  // Test 3 : refus si le chauffeur appartient à un autre transporteur
  chauffeursDB["chf_autre"] = { _id: "chf_autre", proprietaire: "u_autre_transp", actif: true, disponibilite: "disponible" };
  req = { params: { id: "liv2" }, body: { chauffeurId: "chf_autre" }, user: userReq };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 403, "Refus si le chauffeur n'appartient pas au transporteur");

  // Test 4 : livraison terminée -> le chauffeur redevient disponible et sa mission est comptée
  livraisonsDB["liv1"].statut = "en_cours";
  req = {
    params: { id: "liv1" },
    body: { nomDestinataire: "Fatou", signatureUrl: "data:image/png;base64,sig" },
    user: userReq,
  };
  res = fakeRes();
  await livrerAvecPreuve(req, res);
  assert(res._status === 200, "Livraison confirmée -> 200");
  assert(chauffeursDB["chf_dispo"].disponibilite === "disponible", "Le chauffeur redevient disponible après la livraison");
  assert(chauffeursDB["chf_dispo"].statsMissions.missionsCompletees === 1, "La mission complétée est comptée dans l'historique du chauffeur");

  // Test 5 : évaluation avec note au chauffeur
  livraisonsDB["liv1"].evaluation = { clientVersTransporteur: { note: null }, transporteurVersClient: { note: null } };
  req = { params: { id: "liv1" }, body: { note: 5, noteChauffeur: 4 }, user: { _id: "u_client" } };
  res = fakeRes();
  await evaluerLivraison(req, res);
  assert(res._status === 200, "Évaluation avec note chauffeur -> 200");
  assert(chauffeursDB["chf_dispo"].statsMissions.nbNotes === 1, "La note du chauffeur est bien comptabilisée");
  assert(chauffeursDB["chf_dispo"].statsMissions.sommeNotes === 4, "La somme des notes du chauffeur est correcte");

  // Test 6 : acceptation sans chauffeur reste possible (non-régression)
  livraisonsDB["liv3"] = makeLivraisonDoc({ _id: "liv3", client: "u_client", transporteur: null, statut: "en_attente", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv3" }, body: {}, user: userReq };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 200, "Acceptation sans choisir de chauffeur reste possible -> 200 (non-régression)");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
