const mongoose = require("mongoose");

// Module 14 — Comptabilité : remboursements
//
// Comme pour le statut de paiement, ceci n'exécute AUCUN vrai transfert
// d'argent (aucune intégration Mobile Money réelle n'existe encore — Module
// 13). C'est un enregistrement comptable : l'admin note qu'un remboursement
// a été décidé et versé en dehors de l'application (espèces, Mobile Money
// direct), pour garder une trace propre plutôt que de prétendre à un
// virement automatique que le système ne peut pas réellement faire.
const remboursementSchema = new mongoose.Schema(
  {
    livraison: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Livraison",
      required: true,
    },
    reclamation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reclamation",
      default: null,
    },
    montant: {
      type: Number,
      required: true,
      min: 0,
    },
    motif: {
      type: String,
      required: true,
      trim: true,
    },
    enregistrePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Remboursement", remboursementSchema);
