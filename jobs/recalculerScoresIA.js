// Job asynchrone — Module 21 (IA)
//
// Recalcule le score IA de tous les transporteurs à partir de leur historique
// (statsFiabilite). Conçu pour être exécuté en tâche différée (cron), jamais
// en synchrone au moment d'une attribution — cf. utils/scoreIA.js.
//
// Utilisation :
//   node jobs/recalculerScoresIA.js         (exécution ponctuelle / cron)
//   require("./jobs/recalculerScoresIA")    (réutilisation programmatique,
//                                             ex. depuis un endpoint admin)

const User = require("../models/User");
const { calculerScoreIA } = require("../utils/scoreIA");

/**
 * Recalcule et persiste le score IA de tous les transporteurs actifs.
 * @returns {Promise<{ traites: number, misAJour: number }>}
 */
async function recalculerScoresIA() {
  const transporteurs = await User.find({ role: "transporteur", actif: true });

  let misAJour = 0;
  for (const transporteur of transporteurs) {
    const score = calculerScoreIA(transporteur);
    if (score !== null) {
      transporteur.scoreIA = score;
      transporteur.scoreIACalculeLe = new Date();
      await transporteur.save();
      misAJour++;
    }
  }

  return { traites: transporteurs.length, misAJour };
}

// Exécution directe en ligne de commande (cron)
if (require.main === module) {
  require("dotenv").config();
  const connectDB = require("../config/db");

  (async () => {
    await connectDB();
    const resultat = await recalculerScoresIA();
    console.log(
      `✅ Scores IA recalculés : ${resultat.misAJour}/${resultat.traites} transporteurs mis à jour.`
    );
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Échec du recalcul des scores IA :", err.message);
    process.exit(1);
  });
}

module.exports = { recalculerScoresIA };
