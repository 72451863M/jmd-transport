// Test du contrôleur livraisonController avec des modèles Mongoose simulés
// (pas de vraie connexion MongoDB — on vérifie uniquement la logique métier).
const mock = require("mock-require");

// ---- Faux "documents" en mémoire ----
let livraisonsDB = {};
let usersDB = {};

function makeLivraisonDoc(data) {
  const doc = Object.assign({
    toObject() { return Object.assign({}, doc); },
    save: async function () { livraisonsDB[doc._id] = doc; return doc; },
  }, data);
  return doc;
}

const FakeLivraison = {
  findById: async (id) => livraisonsDB[id] || null,
  create: async (data) => {
    const id = "liv_" + Object.keys(livraisonsDB).length;
    const doc = makeLivraisonDoc(Object.assign({ _id: id }, data));
    livraisonsDB[id] = doc;
    return doc;
  },
};

const FakeUser = {
  findByIdAndUpdate: async (id, update) => {
    const u = usersDB[id];
    if (!u) return null;
    if (update.$inc) {
      for (const [path, amount] of Object.entries(update.$inc)) {
        const parts = path.split(".");
        let obj = u;
        for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
        obj[parts[parts.length - 1]] = (obj[parts[parts.length - 1]] || 0) + amount;
      }
    }
    return u;
  },
  findById: async (id) => usersDB[id] || null,
};

const FakeDocument = { create: async () => ({}) };

const FakeNotification = { create: async () => ({}) };
mock("../models/Notification", FakeNotification);
mock("../models/Livraison", FakeLivraison); // chemin tel que vu depuis controllers/
mock("../models/User", FakeUser);
mock("../models/Document", FakeDocument);

const controllerPath = require.resolve("../controllers/livraisonController");
delete require.cache[controllerPath];
const { updateStatutLivraison, accepterLivraison } = require("../controllers/livraisonController");

function fakeRes() {
  const res = {};
  res.status = (code) => { res._status = code; return res; };
  res.json = (payload) => { res._json = payload; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) {
    if (cond) { ok++; console.log("✅", label); }
    else { fail++; console.log("❌", label); }
  }

  // Prépare un client, un transporteur et une livraison "acceptee"
  usersDB["u_client"] = { _id: "u_client", statsFiabilite: {} };
  usersDB["u_transp"] = { _id: "u_transp", statsFiabilite: { missionsAnnuleesParTransporteur: 0, missionsCompletees: 0, missionsALHeure: 0 } };

  livraisonsDB["liv_test1"] = makeLivraisonDoc({
    _id: "liv_test1",
    client: "u_client",
    transporteur: "u_transp",
    statut: "acceptee",
    annulation: {},
  });

  // --- Test 1 : le transporteur annule après "acceptee" ---
  let req = { params: { id: "liv_test1" }, body: { statut: "annulee", motif: "Panne" }, user: { _id: "u_transp", role: "transporteur" } };
  let res = fakeRes();
  await updateStatutLivraison(req, res);
  const liv1 = livraisonsDB["liv_test1"];
  assert(liv1.statut === "en_attente", "Transporteur annule (acceptee) -> remise en en_attente");
  assert(liv1.transporteur === null, "Transporteur annule (acceptee) -> transporteur retiré");
  assert(usersDB["u_transp"].statsFiabilite.missionsAnnuleesParTransporteur === 1, "Pénalité simple appliquée (1 annulation comptée)");

  // --- Test 2 : le transporteur annule après "en_cours" (cas grave) ---
  usersDB["u_transp2"] = { _id: "u_transp2", statsFiabilite: { missionsAnnuleesParTransporteur: 0 } };
  livraisonsDB["liv_test2"] = makeLivraisonDoc({
    _id: "liv_test2", client: "u_client", transporteur: "u_transp2", statut: "en_cours", annulation: {},
  });
  req = { params: { id: "liv_test2" }, body: { statut: "annulee" }, user: { _id: "u_transp2", role: "transporteur" } };
  res = fakeRes();
  await updateStatutLivraison(req, res);
  const liv2 = livraisonsDB["liv_test2"];
  assert(liv2.statut === "en_attente", "Transporteur annule (en_cours) -> remise en en_attente (réattribution urgente)");
  assert(usersDB["u_transp2"].statsFiabilite.missionsAnnuleesParTransporteur === 2, "Pénalité renforcée appliquée (2 annulations comptées)");
  assert(liv2.annulation.motif.includes("signalement"), "Signalement mentionné dans le motif d'annulation");

  // --- Test 3 : le client tente d'annuler une livraison en_cours -> refusé ---
  usersDB["u_transp3"] = { _id: "u_transp3", statsFiabilite: {} };
  livraisonsDB["liv_test3"] = makeLivraisonDoc({
    _id: "liv_test3", client: "u_client", transporteur: "u_transp3", statut: "en_cours", annulation: {},
  });
  req = { params: { id: "liv_test3" }, body: { statut: "annulee" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await updateStatutLivraison(req, res);
  assert(res._status === 400, "Client ne peut pas annuler une livraison en_cours (bloqué)");
  assert(livraisonsDB["liv_test3"].statut === "en_cours", "Statut inchangé après refus");

  // --- Test 4 : on ne peut pas annuler une livraison déjà livrée ---
  livraisonsDB["liv_test4"] = makeLivraisonDoc({
    _id: "liv_test4", client: "u_client", transporteur: "u_transp3", statut: "livree", annulation: {},
  });
  req = { params: { id: "liv_test4" }, body: { statut: "annulee" }, user: { _id: "u_transp3", role: "transporteur" } };
  res = fakeRes();
  await updateStatutLivraison(req, res);
  assert(res._status === 400, "Impossible d'annuler une livraison déjà livrée");

  // --- Test 5 : accepterLivraison incrémente bien la statistique d'acceptation ---
  usersDB["u_transp4"] = { _id: "u_transp4", statsFiabilite: { missionsAcceptees: 0 }, kyc: { statutGlobal: "valide" } };
  usersDB["u_client"] = usersDB["u_client"] || { _id: "u_client", nom: "Client", telephone: "x" };
  livraisonsDB["liv_test5"] = makeLivraisonDoc({ _id: "liv_test5", client: "u_client", transporteur: null, statut: "en_attente", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv_test5" }, user: { _id: "u_transp4", role: "transporteur", kyc: { statutGlobal: "valide" } } };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(livraisonsDB["liv_test5"].statut === "acceptee", "accepterLivraison passe le statut à acceptee (KYC validé)");
  assert(usersDB["u_transp4"].statsFiabilite.missionsAcceptees === 1, "Statistique missionsAcceptees incrémentée");

  // --- Test 6 : impossible d'accepter une mission sans KYC validé ---
  livraisonsDB["liv_test6"] = makeLivraisonDoc({ _id: "liv_test6", client: "u_client", transporteur: null, statut: "en_attente", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv_test6" }, user: { _id: "u_transp5", role: "transporteur", kyc: { statutGlobal: "en_attente_validation" } } };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 403, "Acceptation refusée si le KYC n'est pas validé");
  assert(livraisonsDB["liv_test6"].statut === "en_attente", "Statut inchangé après refus KYC");

  // --- Test 7 : refus aussi si le KYC n'a jamais été soumis (champ absent) ---
  livraisonsDB["liv_test7"] = makeLivraisonDoc({ _id: "liv_test7", client: "u_client", transporteur: null, statut: "en_attente", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv_test7" }, user: { _id: "u_transp6", role: "transporteur" } };
  res = fakeRes();
  await accepterLivraison(req, res);
  assert(res._status === 403, "Acceptation refusée si aucun champ kyc n'existe encore");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
