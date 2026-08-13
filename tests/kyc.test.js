const mock = require("mock-require");
const RealUserModel = require("../models/User");

let usersDB = {};

function makeUser(id, data) {
  const doc = new RealUserModel(Object.assign({
    nom: "U", email: `${id}@test.com`, telephone: "x", password: "123456",
  }, data));
  doc._id = id;
  doc.save = async function () { usersDB[id] = doc; return doc; };
  usersDB[id] = doc;
  return doc;
}

const FakeUser = {
  findById: async (id) => usersDB[id] || null,
  find: async (filter) => {
    return Object.values(usersDB).filter((u) => u.kyc.statutGlobal === filter["kyc.statutGlobal"]);
  },
};

const FakeNotification = { create: async () => ({}) };
mock("../models/Notification", FakeNotification);
mock("../models/User", FakeUser);
const controllerPath = require.resolve("../controllers/kycController");
delete require.cache[controllerPath];
const { donnerConsentement, ajouterDocument, validerKYC, rejeterKYC, getDossiersEnAttente } = require("../controllers/kycController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  const client = makeUser("507f1f77bcf86cd799439011", { role: "client" });
  const admin = makeUser("507f1f77bcf86cd799439012", { role: "admin" });

  // Test 1 : dépôt de document refusé sans consentement préalable
  let req = { user: { _id: "507f1f77bcf86cd799439011" }, body: { type: "cni_nina", url: "http://x/cni.jpg" } };
  let res = fakeRes();
  await ajouterDocument(req, res);
  assert(res._status === 400, "Dépôt de document refusé sans consentement");

  // Test 2 : consentement puis dépôt -> dossier complet (client) -> en_attente_validation
  await donnerConsentement({ user: { _id: "507f1f77bcf86cd799439011" } }, fakeRes());
  res = fakeRes();
  await ajouterDocument(req, res);
  assert(usersDB["507f1f77bcf86cd799439011"].kyc.statutGlobal === "en_attente_validation", "Statut passe à en_attente_validation une fois le dossier complet");

  // Test 3 : validation admin
  req = { params: { userId: "507f1f77bcf86cd799439011" }, user: { _id: "507f1f77bcf86cd799439012", email: "admin@test.com" } };
  res = fakeRes();
  await validerKYC(req, res);
  assert(usersDB["507f1f77bcf86cd799439011"].kyc.statutGlobal === "valide", "Validation admin passe le statut à valide");
  assert(String(usersDB["507f1f77bcf86cd799439011"].kyc.valideParAdminId) === "507f1f77bcf86cd799439012", "Traçabilité : admin validateur enregistré");

  // Test 4 : rejet sans motif refusé
  const transp = makeUser("507f1f77bcf86cd799439013", { role: "transporteur" });
  await donnerConsentement({ user: { _id: "507f1f77bcf86cd799439013" } }, fakeRes());
  req = { params: { userId: "507f1f77bcf86cd799439013" }, body: {}, user: { _id: "507f1f77bcf86cd799439012", email: "admin@test.com" } };
  res = fakeRes();
  await rejeterKYC(req, res);
  assert(res._status === 400, "Rejet refusé sans motif");

  // Test 5 : rejet avec motif
  req = { params: { userId: "507f1f77bcf86cd799439013" }, body: { motif: "Photo illisible" }, user: { _id: "507f1f77bcf86cd799439012", email: "admin@test.com" } };
  res = fakeRes();
  await rejeterKYC(req, res);
  assert(usersDB["507f1f77bcf86cd799439013"].kyc.statutGlobal === "rejete", "Rejet avec motif appliqué");
  assert(usersDB["507f1f77bcf86cd799439013"].kyc.motifRejet === "Photo illisible", "Motif de rejet enregistré");

  // Test 6 : impossible de valider un dossier incomplet
  const transp2 = makeUser("507f1f77bcf86cd799439014", { role: "transporteur" });
  await donnerConsentement({ user: { _id: "507f1f77bcf86cd799439014" } }, fakeRes());
  await ajouterDocument({ user: { _id: "507f1f77bcf86cd799439014" }, body: { type: "cni_nina", url: "http://x/cni.jpg" } }, fakeRes());
  req = { params: { userId: "507f1f77bcf86cd799439014" }, user: { _id: "507f1f77bcf86cd799439012", email: "admin@test.com" } };
  res = fakeRes();
  await validerKYC(req, res);
  assert(res._status === 400, "Validation refusée si le dossier transporteur est incomplet (permis/carte grise manquants)");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
