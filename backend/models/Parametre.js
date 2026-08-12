const mongoose = require("mongoose");

// Module 24 — Administration : gestion des paramètres, commissions, pays,
// devises. Document UNIQUE (singleton) — un seul enregistrement existe pour
// toute la plateforme, retrouvé par son identifiant fixe "global".
//
// Ce qui n'est volontairement PAS ici : les taxes précises par corridor
// (gérées directement sur le modèle Corridor, au cas par cas, une fois
// validées par un expert — jamais de taux inventé ici) et une gestion
// granulaire des rôles/permissions (les 3 rôles du système — client,
// transporteur, admin — sont fixes dans le code ; en documenter la liste
// serait honnête, prétendre à un éditeur de permissions ne le serait pas
// tant qu'aucune vérification fine des droits n'existe réellement).
const parametreSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "global",
    },
    tauxCommission: {
      type: Number,
      default: 0.1, // 10%, valeur V1 validée le 04/08/2026
      min: 0,
      max: 1,
    },
    paysActifs: {
      type: [String],
      default: ["Mali", "Sénégal", "Côte d'Ivoire", "Burkina Faso", "Togo", "Bénin", "Niger", "Guinée-Bissau"],
    },
    devise: {
      type: String,
      default: "FCFA",
    },
    modifieParAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Parametre", parametreSchema);
