const User = require("../models/User");
const { verifierDossierComplet } = require("../utils/kyc");

let ok = 0, fail = 0;
function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

const u1 = new User({ nom: "C", email: "c@test.com", telephone: "x", password: "123456", role: "client" });
u1.kyc.documents.push({ type: "cni_nina", url: "http://x" });
assert(verifierDossierComplet(u1).complet === true, "Client normal : CNI seul suffit");

const u2 = new User({
  nom: "C2", email: "c2@test.com", telephone: "x", password: "123456", role: "client",
  entreprise: { entrepriseId: "507f1f77bcf86cd799439099", roleEntreprise: "proprietaire" },
});
u2.kyc.documents.push({ type: "cni_nina", url: "http://x" });
let r2 = verifierDossierComplet(u2);
assert(r2.complet === false && r2.manquants.includes("rccm") && r2.manquants.includes("nif"), "Propriétaire d'entreprise : RCCM et NIF exigés en plus");

u2.kyc.documents.push({ type: "rccm", url: "http://x" });
u2.kyc.documents.push({ type: "nif", url: "http://x" });
assert(verifierDossierComplet(u2).complet === true, "Propriétaire d'entreprise : dossier complet une fois RCCM+NIF fournis");

const u3 = new User({
  nom: "C3", email: "c3@test.com", telephone: "x", password: "123456", role: "client",
  entreprise: { entrepriseId: "507f1f77bcf86cd799439099", roleEntreprise: "collaborateur" },
});
u3.kyc.documents.push({ type: "cni_nina", url: "http://x" });
assert(verifierDossierComplet(u3).complet === true, "Collaborateur (non propriétaire) : CNI seul suffit, pas de RCCM/NIF");

console.log(`\n${ok} tests réussis, ${fail} échoués`);
process.exit(fail > 0 ? 1 : 0);
