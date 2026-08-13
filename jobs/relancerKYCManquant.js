// Relance par lot les utilisateurs dont le dossier KYC est incomplet ou non
// soumis, sans les spammer : ne relance que si la dernière relance date de
// plus de 3 jours (ou n'a jamais eu lieu).
// Utilisation : node jobs/relancerKYCManquant.js (à brancher sur un cron en
// production, par exemple une fois par jour).

const User = require("../models/User");
const { verifierDossierComplet } = require("../utils/kyc");
const { notifier } = require("../utils/notifications");

const DELAI_MIN_ENTRE_RELANCES_MS = 3 * 24 * 60 * 60 * 1000; // 3 jours

const LABELS = {
  cni_nina: "carte d'identité (CNI/NINA)",
  permis_conduire: "permis de conduire",
  carte_grise: "carte grise",
  rccm: "RCCM",
  nif: "NIF",
};

async function relancerKYCManquant() {
  const utilisateurs = await User.find({
    "kyc.statutGlobal": { $in: ["non_soumis", "incomplet"] },
    role: { $ne: "admin" },
  });

  let relances = 0;
  const maintenant = Date.now();

  for (const user of utilisateurs) {
    const { complet, manquants } = verifierDossierComplet(user);
    if (complet) continue;

    const derniereRelance = user.kyc.derniereRelanceLe ? new Date(user.kyc.derniereRelanceLe).getTime() : 0;
    if (maintenant - derniereRelance < DELAI_MIN_ENTRE_RELANCES_MS) continue;

    user.kyc.derniereRelanceLe = new Date();
    await user.save();

    const listeManquants = manquants.map((m) => LABELS[m] || m).join(", ");
    await notifier({
      destinataire: user._id,
      type: "kyc_relance",
      titre: "Dossier d'identité incomplet",
      message: `Merci de compléter ton dossier KYC — il manque : ${listeManquants}.`,
    });
    relances++;
  }

  return { examines: utilisateurs.length, relances };
}

if (require.main === module) {
  require("dotenv").config();
  const connectDB = require("../config/db");
  (async () => {
    await connectDB();
    const resultat = await relancerKYCManquant();
    console.log(`✅ KYC : ${resultat.relances}/${resultat.examines} utilisateur(s) relancé(s).`);
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Échec de la relance KYC :", err.message);
    process.exit(1);
  });
}

module.exports = { relancerKYCManquant };
