const mongoose = require("mongoose");

// Module 25 — Audit
//
// Enregistre les actions importantes de la plateforme : connexion,
// modification, suppression, paiement, validation. La catégorie "paiement"
// existe dans l'énumération dès maintenant, prête à être utilisée une fois
// le Module 13 (Paiements) construit — aucun paiement réel n'existe encore
// dans ce projet, donc rien n'alimente cette catégorie pour l'instant.
const journalAuditSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null pour une action système ou une tentative de connexion échouée
    },
    typeAction: {
      type: String,
      enum: ["connexion", "modification", "suppression", "paiement", "validation"],
      required: true,
    },
    ressource: {
      type: String, // ex. "Livraison", "Vehicule", "Parametre", "KYC"
      required: true,
    },
    ressourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

journalAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.model("JournalAudit", journalAuditSchema);
