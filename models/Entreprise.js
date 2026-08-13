const mongoose = require("mongoose");

// Module 2 — Gestion des entreprises
// Une entreprise cliente regroupe plusieurs utilisateurs (Chapitre 2.4 du
// cahier des charges : "Entreprise cliente : expéditeur professionnel,
// multi-utilisateurs, facturation groupée"). V1 : propriétaire + collaborateurs,
// sans encore de facturation groupée (Module 14, pas construit).
const entrepriseSchema = new mongoose.Schema(
  {
    raisonSociale: {
      type: String,
      required: true,
    },
    rccm: {
      type: String,
      default: null,
    },
    nif: {
      type: String,
      default: null,
    },
    adresse: {
      type: String,
      default: null,
    },
    telephone: {
      type: String,
      default: null,
    },
    proprietaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Entreprise", entrepriseSchema);
