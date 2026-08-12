const mock = require("mock-require");

const auditDB = [
  { _id: "a1", typeAction: "connexion", ressource: "User", ressourceId: "u1", description: "Connexion", utilisateur: "u1", createdAt: new Date("2026-08-11T10:00:00Z") },
  { _id: "a2", typeAction: "modification", ressource: "Vehicule", ressourceId: "v1", description: "Modif véhicule", utilisateur: "u2", createdAt: new Date("2026-08-11T11:00:00Z") },
  { _id: "a3", typeAction: "suppression", ressource: "Chauffeur", ressourceId: "c1", description: "Suppr chauffeur", utilisateur: "u2", createdAt: new Date("2026-08-11T12:00:00Z") },
];

function buildQuery(list) {
  const wrapper = {};
  wrapper.populate = () => wrapper;
  wrapper.sort = () => { list = [...list].sort((a, b) => b.createdAt - a.createdAt); return wrapper; };
  wrapper.limit = (n) => { list = list.slice(0, n); return wrapper; };
  wrapper.then = (resolve, reject) => Promise.resolve(list).then(resolve, reject);
  return wrapper;
}

const FakeJournalAudit = {
  find: (filtre = {}) => {
    let list = auditDB;
    if (filtre.typeAction) list = list.filter((a) => a.typeAction === filtre.typeAction);
    if (filtre.utilisateur) list = list.filter((a) => a.utilisateur === filtre.utilisateur);
    return buildQuery(list);
  },
};

mock("../models/JournalAudit", FakeJournalAudit);

const controllerPath = require.resolve("../controllers/auditController");
delete require.cache[controllerPath];
const { getJournalAudit } = require("../controllers/auditController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : liste complète, triée du plus récent au plus ancien
  let req = { query: {} };
  let res = fakeRes();
  await getJournalAudit(req, res);
  assert(res._status === 200, "Liste complète -> 200");
  assert(res._json.length === 3, "Les 3 entrées sont bien retournées");
  assert(res._json[0]._id === "a3", "Triée du plus récent au plus ancien (a3 en premier)");

  // Test 2 : filtre par type d'action
  req = { query: { typeAction: "modification" } };
  res = fakeRes();
  await getJournalAudit(req, res);
  assert(res._json.length === 1 && res._json[0]._id === "a2", "Filtre par type d'action fonctionne");

  // Test 3 : filtre par utilisateur
  req = { query: { utilisateur: "u2" } };
  res = fakeRes();
  await getJournalAudit(req, res);
  assert(res._json.length === 2, "Filtre par utilisateur fonctionne (u2 a 2 entrées)");

  // Test 4 : limite personnalisée
  req = { query: { limite: "1" } };
  res = fakeRes();
  await getJournalAudit(req, res);
  assert(res._json.length === 1, "La limite personnalisée est bien appliquée");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
