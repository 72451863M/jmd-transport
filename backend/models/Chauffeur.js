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
    // Module 4 — complète la fiche : catégorie de permis (catégories usuelles
    // en Afrique de l'Ouest francophone), date d'expiration, certificats
    // (ex. transport de matières dangereuses), disponibilité et historique
    // agrégé des missions/notes.
    categoriePermis: {
      type: String,
      enum: ["A", "B", "C", "D", "E", null],
      default: null,
    },
    dateExpirationPermis: {
      type: Date,
      default: null,
    },
    certificats: [
      {
        nom: { type: String, required: true, trim: true },
        dateExpiration: { type: Date, default: null },
      },
    ],
    disponibilite: {
      type: String,
      enum: ["disponible", "en_mission", "indisponible"],
      default: "disponible",
    },
    statsMissions: {
      missionsCompletees: { type: Number, default: 0 },
      sommeNotes: { type: Number, default: 0 },
      nbNotes: { type: Number, default: 0 },
    },
    actif: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chauffeur", chauffeurSchema);
