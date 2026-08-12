const mock = require("mock-require");

const FakeJournalAuditEnErreur = {
  create: async () => { throw new Error("Connexion base de données indisponible (simulée)"); },
};

mock("../models/JournalAudit", FakeJournalAuditEnErreur);

const auditPath = require.resolve("../utils/audit");
delete require.cache[auditPath];
const { enregistrerAudit } = require("../utils/audit");

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test critique : même si l'écriture échoue, enregistrerAudit ne doit
  // JAMAIS lever d'exception — l'action métier appelante ne doit pas planter
  // à cause d'un souci de journalisation.
  let exceptionLevee = false;
  let resultat;
  try {
    resultat = await enregistrerAudit({
      utilisateur: "u1",
      typeAction: "modification",
      ressource: "Vehicule",
      ressourceId: "v1",
      description: "Test",
    });
  } catch (err) {
    exceptionLevee = true;
  }

  assert(exceptionLevee === false, "Aucune exception levée même si l'écriture en base échoue");
  assert(resultat === null, "Retourne null en cas d'échec, plutôt que de planter l'appelant");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
