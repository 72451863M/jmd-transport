const mongoose = require("mongoose");

// Module 16 — Notifications (V1 : in-app uniquement)
// Le cahier des charges prévoit SMS/e-mail/push/WhatsApp (Module 16) ; ce
// backend n'ayant pas encore d'intégration avec un fournisseur externe, la
// V1 se limite aux notifications in-app, avec un design qui permet d'ajouter
// des canaux supplémentaires plus tard sans changer le modèle (ajout d'un
// champ "canaux" le moment venu).
const notificationSchema = new mongoose.Schema(
  {
    destinataire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "mission_acceptee",
        "mission_annulee",
        "livraison_livree",
        "kyc_valide",
        "kyc_rejete",
        "kyc_relance",
        "reclamation_repondue",
        "evaluation_recue",
        "entreprise_invitation",
        "message_recu",
        "nouvelle_demande_disponible",
      ],
      required: true,
    },
    titre: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    lien: {
      // référence libre (ex. l'id d'une livraison ou d'une réclamation) que le
      // frontend peut utiliser pour rediriger l'utilisateur au clic
      type: String,
      default: null,
    },
    lu: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
