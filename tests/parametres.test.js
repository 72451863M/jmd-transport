const mock = require("mock-require");

let parametresDB = {};

const FakeParametre = {
  findById: async (id) => parametresDB[id] || null,
  create: async (data) => {
    const doc = Object.assign({}, data, { save: async function () { parametresDB[doc._id] = doc; return doc; } });
    if (doc.tauxCommission === undefined) doc.tauxCommission = 0.1;
    if (doc.paysActifs === undefined) doc.paysActifs = ["Mali"];
    if (doc.devise === undefined) doc.devise = "FCFA";
    parametresDB[doc._id] = doc;
    return doc;
  },
};

mock("../models/Parametre", FakeParametre);

const controllerPath = require.resolve("../controllers/parametreController");
delete require.cache[controllerPath];
const { getParametres, modifierParametres } = require("../controllers/parametreController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : premier accès -> création automatique avec valeurs par défaut
  let req = {};
  let res = fakeRes();
  await getParametres(req, res);
  assert(res._status === 200, "Premier accès aux paramètres -> 200");
  assert(res._json.tauxCommission === 0.1, "Taux de commission par défaut = 10%");
  assert(Array.isArray(res._json.paysActifs) && res._json.paysActifs.length > 0, "Liste de pays actifs par défaut non vide");

  // Test 2 : modification du taux de commission
  req = { body: { tauxCommission: 0.12 }, user: { _id: "u_admin" } };
  res = fakeRes();
  await modifierParametres(req, res);
  assert(res._status === 200, "Modification du taux de commission -> 200");
  assert(res._json.tauxCommission === 0.12, "Le nouveau taux (12%) est bien enregistré");
  assert(String(res._json.modifieParAdminId) === "u_admin", "L'admin ayant modifié est bien enregistré");

  // Test 3 : taux invalide refusé (négatif)
  req = { body: { tauxCommission: -0.5 }, user: { _id: "u_admin" } };
  res = fakeRes();
  await modifierParametres(req, res);
  assert(res._status === 400, "Taux de commission négatif refusé -> 400");

  // Test 4 : taux invalide refusé (supérieur à 1 = 100%)
  req = { body: { tauxCommission: 1.5 }, user: { _id: "u_admin" } };
  res = fakeRes();
  await modifierParametres(req, res);
  assert(res._status === 400, "Taux de commission > 100% refusé -> 400");

  // Test 5 : liste de pays vide refusée
  req = { body: { paysActifs: [] }, user: { _id: "u_admin" } };
  res = fakeRes();
  await modifierParametres(req, res);
  assert(res._status === 400, "Liste de pays actifs vide refusée -> 400");

  // Test 6 : modification de la liste des pays actifs
  req = { body: { paysActifs: ["Mali", "Sénégal"] }, user: { _id: "u_admin" } };
  res = fakeRes();
  await modifierParametres(req, res);
  assert(res._status === 200, "Modification de la liste des pays -> 200");
  assert(res._json.paysActifs.length === 2, "La nouvelle liste de pays est bien enregistrée");

  // Test 7 : les paramètres persistent entre deux lectures (relecture après modification)
  req = {};
  res = fakeRes();
  await getParametres(req, res);
  assert(res._json.tauxCommission === 0.12, "Le taux modifié persiste bien lors d'une relecture");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
