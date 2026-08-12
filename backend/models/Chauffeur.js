const mongoose = require("mongoose");

// Module 4 — Gestion des chauffeurs (rattaché au Module 3 : « chaque
// transporteur pourra gérer ses chauffeurs »). Limite documentée : il ne
// s'agit pas encore d'un vrai compte utilisateur (pas de connexion propre
// pour le chauffeur) — juste une fiche gérée par le transporteur qui
// l'emploie, exactement comme pour les véhicules.
const chauffeurSchema = new mongoose.Schema(
  {
    proprietaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    telephone: {
      type: String,
      required: true,
      trim: true,
    },
    numeroPermis: {
      type: String,
      default: null,
      trim: true,
    },
    actif: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chauffeur", chauffeurSchema);
