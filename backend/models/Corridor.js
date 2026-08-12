const mongoose = require("mongoose");

// Module 27 — Gestion des corridors logistiques
//
// Important (cf. cahier des charges V4.0, section "Points ouverts avant
// l'Étape 1") : la fiscalité et les formalités douanières par pays ne sont
// PAS définies dans ce document et ne doivent pas être inventées ici. Ce
// modèle se limite donc à des données de référence (quels corridors existent,
// quels pays ils relient) — aucun champ de taxe ou de montant de douane
// n'est calculé automatiquement tant que ces règles n'ont pas été validées
// pays par pays.
const corridorSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
    },
    paysDepart: {
      type: String,
      required: true,
    },
    paysArrivee: {
      type: String,
      required: true,
    },
    villesPrincipales: {
      type: [String],
      default: [],
    },
    actif: {
      type: Boolean,
      default: true,
    },
    // Module 24 (Administration — gestion des taxes) : champs facultatifs
    // que l'admin peut renseigner une fois les vraies règles fiscales
    // validées par un comptable/juriste pour ce corridor précis. Restent
    // null tant que personne ne les a saisis — jamais de valeur par défaut
    // inventée ici.
    tauxTaxeDouane: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },
    noteReglementaire: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Corridor", corridorSchema);
