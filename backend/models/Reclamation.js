const mongoose = require("mongoose");

// Module 18 — Réclamations
// Note de périmètre (comme pour le KYC entreprise) : le rôle "Agent du
// service client" identifié au Chapitre 1 du cahier des charges n'est pas
// encore implémenté comme rôle distinct (seuls admin/client/transporteur
// existent dans ce backend) — c'est donc l'admin qui traite les réclamations
// pour l'instant.
const reclamationSchema = new mongoose.Schema(
  {
    livraison: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Livraison",
      required: true,
    },
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roleAuteur: {
      type: String,
      enum: ["client", "transporteur"],
      required: true,
    },
    motif: {
      type: String,
      enum: ["retard", "marchandise_endommagee", "marchandise_manquante", "comportement", "paiement", "autre"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    pieceJointeUrl: {
      type: String,
      default: null,
    },
    statut: {
      type: String,
      enum: ["ouverte", "en_cours", "resolue", "rejetee"],
      default: "ouverte",
    },
    reponse: {
      texte: { type: String, default: null },
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      repondueLe: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reclamation", reclamationSchema);
