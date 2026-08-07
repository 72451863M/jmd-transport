const mongoose = require("mongoose");

// Module 11 — Gestion documentaire
// La lettre de voiture est générée automatiquement à l'acceptation d'une
// mission (donneesGenerees rempli, url absent) ; les autres types de
// documents (bon de livraison, assurance, photo, autre) sont ajoutés
// manuellement par le client ou le transporteur via une URL (même principe
// que le dépôt de document KYC : l'upload du fichier lui-même se fait côté
// client vers Cloudinary).
const documentSchema = new mongoose.Schema(
  {
    livraison: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Livraison",
      required: true,
    },
    type: {
      type: String,
      enum: ["lettre_voiture", "bon_livraison", "facture", "assurance", "photo", "autre"],
      required: true,
    },
    url: {
      type: String,
      default: null,
    },
    // Contenu structuré pour les documents générés par le système (lettre de voiture)
    donneesGenerees: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ajoutePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
