const mock = require("mock-require");

let livraisonsDB = {};
let counter = 1;
const notifsEnvoyees = [];

function makeLivraisonDoc(data) {
  const id = "liv_" + counter++;
  const doc = Object.assign({ _id: id }, data, {
    toObject() { return Object.assign({}, doc); },
    save: async function () { livraisonsDB[id] = doc; return doc; },
  });
  livraisonsDB[id] = doc;
  return doc;
}

const usersDB = {
  t1: { _id: "t1", role: "transporteur", actif: true, kyc: { statutGlobal: "valide" } },
  t2: { _id: "t2", role: "transporteur", actif: true, kyc: { statutGlobal: "valide" } },
  t3_kyc_incomplet: { _id: "t3_kyc_incomplet", role: "transporteur", actif: true, kyc: { statutGlobal: "en_attente_validation" } },
  t4_inactif: { _id: "t4_inactif", role: "transporteur", actif: false, kyc: { statutGlobal: "valide" } },
};

const FakeLivraison = { create: async (data) => makeLivraisonDoc(data) };
const FakeUser = {
  find: async (filter) =>
    Object.values(usersDB).filter(
      (u) => u.role === filter.role && u.actif === filter.actif && u.kyc.statutGlobal === filter["kyc.statutGlobal"]
    ),
};
const FakeNotification = {
  create: async (data) => { notifsEnvoyees.push(data); return data; },
};

mock("../models/Livraison", FakeLivraison);
mock("../models/Corridor", { findOne: async () => null });
mock("../models/User", FakeUser);
mock("../models/Document", {});
mock("../models/Notification", FakeNotification);
mock("../models/Parametre", { findById: async () => null, create: async (data) => data });

const controllerPath = require.resolve("../controllers/livraisonController");
delete require.cache[controllerPath];
const { creerLivraison } = require("../controllers/livraisonController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  const req = {
    body: { adresseDepart: { label: "Médine" }, adresseArrivee: { label: "ACI 2000" }, distanceKm: 6, poidsKg: 10 },
    user: { _id: "u_client" },
  };
  const res = fakeRes();
  await creerLivraison(req, res);

  assert(res._status === 201, "Création de la demande -> 201");
  assert(notifsEnvoyees.length === 2, "Exactement 2 transporteurs notifiés (les disponibles et vérifiés)");
  assert(notifsEnvoyees.every((n) => n.type === "nouvelle_demande_disponible"), "Type de notification correct");
  assert(notifsEnvoyees.some((n) => n.destinataire === "t1") && notifsEnvoyees.some((n) => n.destinataire === "t2"), "Les bons transporteurs sont notifiés (t1, t2)");
  assert(!notifsEnvoyees.some((n) => n.destinataire === "t3_kyc_incomplet"), "Un transporteur au KYC incomplet n'est pas notifié");
  assert(!notifsEnvoyees.some((n) => n.destinataire === "t4_inactif"), "Un transporteur inactif n'est pas notifié");
  assert(notifsEnvoyees[0].message.includes("Médine") && notifsEnvoyees[0].message.includes("ACI 2000"), "Le message contient bien le trajet");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
