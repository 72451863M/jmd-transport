const mongoose = require("mongoose");

// Module 17 — Messagerie interne
// Objectif produit explicite (06/08/2026) : réduire le besoin d'échanger des
// numéros de téléphone en direct, en donnant au client et au transporteur un
// canal de communication qui reste à l'intérieur de la plateforme pendant
// toute la durée d'une mission — cf. le masquage du téléphone tant que la
// mission n'est pas acceptée (livraisonController.js).
const messageSchema = new mongoose.Schema(
  {
    livraison: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Livraison",
      required: true,
    },
    expediteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    destinataire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    texte: {
      type: String,
      required: true,
    },
    lu: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
