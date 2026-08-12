const mock = require("mock-require");

let auditDB = [];

const FakeJournalAuditOK = {
  create: async (data) => { const doc = { _id: "aud_" + auditDB.length, ...data }; auditDB.push(doc); return doc; },
};

mock("../models/JournalAudit", FakeJournalAuditOK);

const auditPath = require.resolve("../utils/audit");
delete require.cache[auditPath];
const { enregistrerAudit } = require("../utils/audit");

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : enregistrement réussi
  let entree = await enregistrerAudit({
    utilisateur: "u1",
    typeAction: "connexion",
    ressource: "User",
    ressourceId: "u1",
    description: "Connexion de Test",
  });
  assert(entree !== null, "Enregistrement réussi -> retourne l'entrée créée");
  assert(auditDB.length === 1, "L'entrée est bien stockée");
  assert(auditDB[0].typeAction === "connexion", "Le type d'action est correctement enregistré");

  // Test 2 : utilisateur null accepté (action système)
  entree = await enregistrerAudit({
    utilisateur: null,
    typeAction: "suppression",
    ressource: "Vehicule",
    ressourceId: "v1",
    description: "Suppression système",
  });
  assert(entree !== null, "Un utilisateur null (action système) est accepté");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
