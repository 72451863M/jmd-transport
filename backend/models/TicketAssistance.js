const mongoose = require("mongoose");

// Module 28 — Centre d'assistance : système de tickets
//
// Distinct du modèle Reclamation (Module 18), qui est obligatoirement lié à
// une livraison précise. Un ticket d'assistance couvre les demandes
// générales qui ne concernent pas forcément une livraison — "pourquoi mon
// KYC a été rejeté", "comment fonctionne la commission", un souci de
// compte, etc.
const ticketAssistanceSchema = new mongoose.Schema(
  {
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sujet: {
      type: String,
      required: true,
      trim: true,
    },
    categorie: {
      type: String,
      enum: ["kyc", "compte", "paiement", "flotte", "technique", "autre"],
      default: "autre",
    },
    statut: {
      type: String,
      enum: ["ouvert", "en_cours", "resolu", "ferme"],
      default: "ouvert",
    },
    messages: [
      {
        auteur: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["client", "transporteur", "admin"], required: true },
        texte: { type: String, required: true },
        envoyeLe: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ticketAssistanceSchema.index({ auteur: 1, createdAt: -1 });

module.exports = mongoose.model("TicketAssistance", ticketAssistanceSchema);
