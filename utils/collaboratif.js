const { TARIF_BASE_FCFA, PRIX_PAR_KM_FCFA, PRIX_PAR_KG_FCFA, SEUIL_POIDS_INCLUS_KG } = require("./tarification");

// Module 29 — Transport collaboratif
//
// Limite technique assumée : pas de vrai moteur d'optimisation d'itinéraire
// (aucun service de routage réel branché, même limite que le Module 10) —
// la compatibilité de trajet se fait par correspondance exacte des
// libellés départ/arrivée, pas par analyse géographique de trajets
// "proches". C'est un algorithme déterministe et explicable, pas une IA.

const FENETRE_DATE_HEURES = 12; // deux demandes sont "à date compatible" si <= 12h d'écart

// Catégories de marchandises qui ne peuvent être regroupées qu'entre elles
// (jamais mélangées avec autre chose), par prudence sur la sécurité du
// chargement — reprend les règles déjà définies au Module 6, sans en
// inventer de nouvelles.
const CATEGORIES_EXCLUSIVES = ["produits_dangereux", "produits_petroliers", "produits_refrigeres"];

function marchandisesCompatibles(typeA, typeB) {
  if (typeA === typeB) return true;
  if (CATEGORIES_EXCLUSIVES.includes(typeA) || CATEGORIES_EXCLUSIVES.includes(typeB)) return false;
  return true; // colis / palettes / materiaux_construction / produits_agricoles / conteneurs se mélangent librement
}

function datesCompatibles(dateA, dateB) {
  if (!dateA || !dateB) return true; // pas de date précisée -> pas de contrainte inventée
  const diffHeures = Math.abs(new Date(dateA) - new Date(dateB)) / 3600000;
  return diffHeures <= FENETRE_DATE_HEURES;
}

/**
 * Vérifie si une nouvelle demande peut rejoindre un groupe existant.
 */
function demandeCompatibleAvecGroupe(demande, groupe) {
  if (groupe.statut !== "ouvert") return false;
  if (groupe.adresseDepart !== demande.adresseDepart?.label) return false;
  if (groupe.adresseArrivee !== demande.adresseArrivee?.label) return false;
  if (!datesCompatibles(groupe.dateSouhaitee, demande.dateLivraisonPrevue)) return false;
  if (groupe.capaciteRestanteKg < (demande.poidsKg || 0)) return false;

  const typeGroupe = groupe.typeMarchandiseDominant || "colis";
  if (!marchandisesCompatibles(typeGroupe, demande.typeMarchandise || "colis")) return false;

  return true;
}

/**
 * Cherche un groupe ouvert compatible parmi une liste ; retourne null si
 * aucun ne convient (l'appelant devra alors en créer un nouveau).
 */
function trouverGroupeCompatible(demande, groupesOuverts) {
  return groupesOuverts.find((g) => demandeCompatibleAvecGroupe(demande, g)) || null;
}

/**
 * Calcule le prix total du groupe : le forfait de base et le coût de
 * distance ne sont payés qu'UNE fois pour tout le groupe (c'est la seule
 * vraie source d'économie, honnête et vérifiable — pas de remise inventée) ;
 * le coût du poids reste individuel à chaque demande.
 */
function calculerPrixGroupe(distanceKm, demandes) {
  const distance = Math.max(0, Number(distanceKm) || 0);
  const coutPoidsCumule = demandes.reduce((total, d) => {
    const poidsFacturable = Math.max(0, (d.poidsKg || 0) - SEUIL_POIDS_INCLUS_KG);
    return total + poidsFacturable * PRIX_PAR_KG_FCFA;
  }, 0);
  return Math.round(TARIF_BASE_FCFA + distance * PRIX_PAR_KM_FCFA + coutPoidsCumule);
}

/**
 * Répartit le prix du groupe entre les demandes, proportionnellement au
 * poids de chacune (le cahier des charges cite poids/volume/distance —
 * le poids est le facteur le plus fiable disponible aujourd'hui, le volume
 * étant facultatif et souvent absent). Calcule aussi l'économie réalisée
 * par rapport au prix individuel (solo) déjà calculé à la création de
 * chaque demande.
 */
function calculerRepartitionCouts(distanceKm, demandes) {
  const prixGroupeTotal = calculerPrixGroupe(distanceKm, demandes);
  const poidsTotal = demandes.reduce((total, d) => total + (d.poidsKg || 0), 0);

  return demandes.map((d) => {
    const partPoids = poidsTotal > 0 ? (d.poidsKg || 0) / poidsTotal : 1 / demandes.length;
    const partAllouee = Math.round(prixGroupeTotal * partPoids);
    const prixSolo = d.prix || 0;
    const economie = Math.max(0, prixSolo - partAllouee);
    return { livraisonId: d._id, partAllouee, prixSolo, economie };
  });
}

/**
 * Vue filtrée d'un groupe pour un client donné : ne révèle jamais les
 * informations confidentielles des autres membres (nom, téléphone, adresse
 * exacte, contenu du colis) — uniquement la ville de livraison et l'heure
 * estimée, conformément à la liste blanche validée (anomalie #9, V3.0).
 */
function vueGroupePourClient(groupe, demandesDuGroupe, livraisonIdDemandeur) {
  return {
    _id: groupe._id,
    adresseDepart: groupe.adresseDepart,
    adresseArrivee: groupe.adresseArrivee,
    statut: groupe.statut,
    nombreParticipants: demandesDuGroupe.length,
    autresLivraisons: demandesDuGroupe
      .filter((d) => d._id.toString() !== livraisonIdDemandeur.toString())
      .map((d) => ({
        villeLivraison: d.adresseArrivee?.label || null,
        heureEstimee: d.dateLivraisonPrevue || null,
      })),
  };
}

module.exports = {
  marchandisesCompatibles,
  datesCompatibles,
  demandeCompatibleAvecGroupe,
  trouverGroupeCompatible,
  calculerPrixGroupe,
  calculerRepartitionCouts,
  vueGroupePourClient,
  FENETRE_DATE_HEURES,
  CATEGORIES_EXCLUSIVES,
};
