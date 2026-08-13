const mock = require("mock-require");

let corridorsDB = {
  cor1: { _id: "cor1", nom: "Dakar–Bamako", paysDepart: "Sénégal", paysArrivee: "Mali", tauxTaxeDouane: null, noteReglementaire: null, save: async function () { corridorsDB["cor1"] = this; return this; } },
};

const FakeCorridor = { findById: async (id) => corridorsDB[id] || null };
mock("../models/Corridor", FakeCorridor);

const controllerPath = require.resolve("../controllers/corridorController");
delete require.cache[controllerPath];
const { modifierTaxeCorridor } = require("../controllers/corridorController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : par défaut, aucune taxe n'est inventée (null)
  assert(corridorsDB["cor1"].tauxTaxeDouane === null, "Le taux de taxe d'un corridor n'est jamais inventé par défaut (null)");

  // Test 2 : l'admin peut enregistrer un taux une fois validé en externe
  let req = { params: { id: "cor1" }, body: { tauxTaxeDouane: 0.05, noteReglementaire: "Validé par le cabinet comptable le 12/08/2026" } };
  let res = fakeRes();
  await modifierTaxeCorridor(req, res);
  assert(res._status === 200, "Enregistrement du taux de taxe validé -> 200");
  assert(res._json.tauxTaxeDouane === 0.05, "Le taux de taxe est bien enregistré (5%)");
  assert(res._json.noteReglementaire.includes("cabinet comptable"), "La note réglementaire est bien enregistrée");

  // Test 3 : taux invalide refusé
  req = { params: { id: "cor1" }, body: { tauxTaxeDouane: 2.5 } };
  res = fakeRes();
  await modifierTaxeCorridor(req, res);
  assert(res._status === 400, "Taux de taxe > 100% refusé -> 400");

  // Test 4 : corridor introuvable
  req = { params: { id: "cor_inexistant" }, body: { tauxTaxeDouane: 0.05 } };
  res = fakeRes();
  await modifierTaxeCorridor(req, res);
  assert(res._status === 404, "Corridor introuvable -> 404");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
