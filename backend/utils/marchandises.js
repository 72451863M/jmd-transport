// Module 6 — Gestion des marchandises
//
// Le cahier des charges liste 8 types de fret, chacun avec « ses propres
// règles de transport ». Ici, on structure ce qui peut l'être sans inventer
// de données réglementaires précises (températures exactes, classification
// ADR des matières dangereuses, poids par essieu...) — ce sont des chiffres
// réels qui nécessitent une vraie expertise réglementaire, pas une
// estimation. Deux types de règles sont appliquées, toutes deux vérifiables
// et défendables :
//   1. Compatibilité avec le type de véhicule (un produit réfrigéré a
//      besoin d'un véhicule frigorifique, pas d'une moto)
//   2. Déclaration explicite obligatoire pour les matières dangereuses et
//      les produits pétroliers (responsabilise l'expéditeur plutôt que de
//      prétendre que l'application valide elle-même la conformité
//      réglementaire réelle)

const TYPES_MARCHANDISE = [
  "colis",
  "palettes",
  "materiaux_construction",
  "produits_agricoles",
  "produits_petroliers",
  "produits_dangereux",
  "produits_refrigeres",
  "conteneurs",
];

const LABELS_TYPES_MARCHANDISE = {
  colis: "Colis",
  palettes: "Palettes",
  materiaux_construction: "Matériaux de construction",
  produits_agricoles: "Produits agricoles",
  produits_petroliers: "Produits pétroliers",
  produits_dangereux: "Produits dangereux",
  produits_refrigeres: "Produits réfrigérés",
  conteneurs: "Conteneurs",
};

// Types de véhicule jugés adaptés pour chaque type de marchandise. Une
// valeur null signifie "tous les types de véhicule conviennent".
const VEHICULES_COMPATIBLES = {
  colis: null,
  palettes: ["camionnette", "camion", "semi_remorque"],
  materiaux_construction: ["camion", "semi_remorque"],
  produits_agricoles: null,
  produits_petroliers: ["citerne"],
  produits_dangereux: ["camion", "semi_remorque", "citerne"],
  produits_refrigeres: ["frigorifique"],
  conteneurs: ["semi_remorque"],
};

// Types de marchandise nécessitant une déclaration explicite de
// l'expéditeur avant de pouvoir créer la demande (responsabilise sans
// prétendre à une validation réglementaire que l'application ne peut pas
// faire).
const NECESSITE_DECLARATION = ["produits_petroliers", "produits_dangereux"];

/**
 * Vérifie si un véhicule est adapté au type de marchandise déclaré.
 * @returns {{ compatible: boolean, message: string|null }}
 */
function verifierCompatibiliteVehicule(typeMarchandise, vehicule) {
  const compatibles = VEHICULES_COMPATIBLES[typeMarchandise];
  if (!compatibles) return { compatible: true, message: null };
  if (!vehicule) {
    return {
      compatible: false,
      message: `Le transport de "${LABELS_TYPES_MARCHANDISE[typeMarchandise]}" nécessite un véhicule adapté (${compatibles.join(", ")}) — choisis un véhicule de ta flotte.`,
    };
  }
  if (!compatibles.includes(vehicule.type)) {
    return {
      compatible: false,
      message: `Le transport de "${LABELS_TYPES_MARCHANDISE[typeMarchandise]}" nécessite un véhicule de type ${compatibles.join(" ou ")} (véhicule choisi : ${vehicule.type}).`,
    };
  }
  return { compatible: true, message: null };
}

module.exports = {
  TYPES_MARCHANDISE,
  LABELS_TYPES_MARCHANDISE,
  VEHICULES_COMPATIBLES,
  NECESSITE_DECLARATION,
  verifierCompatibiliteVehicule,
};
