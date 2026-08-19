// Formule de tarification V1 — validée le 04/08/2026 (Étape 2 du projet).
// Prix = forfait de base + (distance x prix/km) + (poids au-delà de 20kg x prix/kg)
//        + majoration express (+25%) + majoration créneau nuit 20h-6h (+20%)
//
// Ces montants sont une V1 volontairement simple et transparente ; ils sont
// ajustables sans changer la structure de la formule ni le modèle de données.

const TARIF_BASE_FCFA = 1000;
const PRIX_PAR_KM_FCFA = 150;
const PRIX_PAR_KG_FCFA = 50;
const SEUIL_POIDS_INCLUS_KG = 20;
const MAJORATION_EXPRESS = 0.25;
const MAJORATION_NUIT = 0.2;
const HEURE_DEBUT_NUIT = 20; // 20h
const HEURE_FIN_NUIT = 6; // 6h

function estCreneauNuit(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  const heure = d.getHours();
  return heure >= HEURE_DEBUT_NUIT || heure < HEURE_FIN_NUIT;
}

/**
 * Calcule le prix estimé d'une livraison selon la formule V1 validée.
 * @param {Object} params
 * @param {number} params.distanceKm
 * @param {number} params.poidsKg
 * @param {boolean} [params.optionExpress]
 * @param {Date|string} [params.dateEnlevement] - sert à détecter le créneau nuit ; par défaut l'heure actuelle
 * @returns {{ prix: number, details: Object }}
 */
function calculerPrixEstime({ distanceKm = 0, poidsKg = 0, optionExpress = false, dateEnlevement } = {}) {
  const distance = Math.max(0, Number(distanceKm) || 0);
  const poids = Math.max(0, Number(poidsKg) || 0);
  const poidsFacturable = Math.max(0, poids - SEUIL_POIDS_INCLUS_KG);

  let prix = TARIF_BASE_FCFA + distance * PRIX_PAR_KM_FCFA + poidsFacturable * PRIX_PAR_KG_FCFA;

  const nuit = estCreneauNuit(dateEnlevement);
  if (optionExpress) prix *= 1 + MAJORATION_EXPRESS;
  if (nuit) prix *= 1 + MAJORATION_NUIT;

  prix = Math.round(prix);

  return {
    prix,
    details: {
      tarifBase: TARIF_BASE_FCFA,
      coutDistance: distance * PRIX_PAR_KM_FCFA,
      coutPoids: poidsFacturable * PRIX_PAR_KG_FCFA,
      majorationExpress: optionExpress,
      majorationNuit: nuit,
    },
  };
}

// Commission JMD Transport V1 — validée : 10 % du prix de la course par
// défaut. Configurable par l'admin (Module 24) via Parametre.tauxCommission
// — le taux par défaut ci-dessous ne sert que de repli si aucun paramètre
// n'a encore été enregistré (installation neuve).
const TAUX_COMMISSION = 0.10;

function calculerCommission(prix, tauxCommission = TAUX_COMMISSION) {
  return Math.round((Number(prix) || 0) * tauxCommission);
}

// Seuil de retard V1 — validé : alerte au-delà de 30 minutes de dépassement de l'ETA.
const SEUIL_RETARD_MINUTES = 30;

function estEnRetard(dateLivraisonPrevue, maintenant = new Date()) {
  if (!dateLivraisonPrevue) return false;
  const prevue = new Date(dateLivraisonPrevue);
  const diffMinutes = (maintenant.getTime() - prevue.getTime()) / 60000;
  return diffMinutes > SEUIL_RETARD_MINUTES;
}

module.exports = {
  calculerPrixEstime,
  calculerCommission,
  estEnRetard,
  TAUX_COMMISSION,
  SEUIL_RETARD_MINUTES,
  TARIF_BASE_FCFA,
  PRIX_PAR_KM_FCFA,
  PRIX_PAR_KG_FCFA,
  SEUIL_POIDS_INCLUS_KG,
};
