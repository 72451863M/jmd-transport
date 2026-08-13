// Module 21 — Intelligence artificielle (V1)
//
// Principe validé le 04/08/2026 (Étape 1, section 8) : ce module ne doit
// JAMAIS être appelé de façon synchrone par le Module 9 (Attribution), pour
// éviter la dépendance circulaire Attribution <-> IA. Il calcule un score
// enrichi en tâche asynchrone/par lot (voir jobs/recalculerScoresIA.js),
// que le Module 9 se contente ensuite de LIRE (champ User.scoreIA).
//
// Formule V1 : lissage bayésien simple du score de fiabilité (Module 9 de
// base) vers un score neutre pour les transporteurs à faible historique,
// afin de ne pas surestimer/sous-estimer un transporteur sur un petit
// échantillon de missions. Volontairement simple et explicable plutôt
// qu'un modèle opaque, conformément au principe retenu pour toutes les
// formules V1 du projet.

const SEUIL_CONFIANCE_MISSIONS = 20; // au-delà, on fait pleinement confiance au score de base
const SCORE_NEUTRE_NOUVEAU = 55; // leger optimisme pour donner sa chance aux nouveaux transporteurs

/**
 * Calcule le score IA enrichi d'un transporteur.
 * @param {import('../models/User')} user - document Mongoose User (role transporteur)
 * @returns {number|null} score sur 100, ou null si le score de base est indisponible
 */
function calculerScoreIA(user) {
  if (!user || typeof user.calculerScoreFiabilite !== "function") return null;

  const scoreBase = user.calculerScoreFiabilite();
  if (scoreBase === null) return null;

  const missionsCompletees = (user.statsFiabilite && user.statsFiabilite.missionsCompletees) || 0;
  const poidsConfiance = Math.min(missionsCompletees / SEUIL_CONFIANCE_MISSIONS, 1);

  const scoreIA = poidsConfiance * scoreBase + (1 - poidsConfiance) * SCORE_NEUTRE_NOUVEAU;
  return Math.round(scoreIA * 10) / 10;
}

module.exports = { calculerScoreIA, SEUIL_CONFIANCE_MISSIONS, SCORE_NEUTRE_NOUVEAU };
