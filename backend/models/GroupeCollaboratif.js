const mongoose = require("mongoose");

// Module 29 — Transport collaboratif
//
// Regroupe plusieurs demandes de transport compatibles (même trajet, dates
// proches, marchandises compatibles) sur un même véhicule. Limite assumée :
// pas de vrai moteur d'optimisation d'itinéraire (aucun service de routage
// réel branché — même limite que le Module 10) — le regroupement se fait
// sur la correspondance exacte du trajet (mêmes libellés départ/arrivée ou
// même corridor) et une fenêtre de date, pas sur une analyse géographique
// fine de trajets "proches".
const groupeCollaboratifSchema = new mongoose.Schema(
  {
    adresseDepart: {
      type: String,
      required: true,
    },
    adresseArrivee: {
      type: String,
      required: true,
    },
    corridor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corridor",
      default: null,
    },
    dateSouhaitee: {
      type: Date,
      required: true,
    },
    capaciteTotaleKg: {
      type: Number,
      required: true,
    },
    capaciteRestanteKg: {
      type: Number,
      required: true,
    },
    demandes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Livraison",
      },
    ],
    economieTotaleEstimee: {
      type: Number,
      default: 0,
    },
    statut: {
      type: String,
      enum: ["ouvert", "complet", "en_cours", "termine"],
      default: "ouvert",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GroupeCollaboratif", groupeCollaboratifSchema);
