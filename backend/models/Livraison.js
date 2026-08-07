const mongoose = require("mongoose");

const livraisonSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transporteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adresseDepart: {
      label: { type: String, required: true },
      pays: { type: String, default: "Mali" },
      lat: Number,
      lng: Number,
    },
    adresseArrivee: {
      label: { type: String, required: true },
      pays: { type: String, default: "Mali" },
      lat: Number,
      lng: Number,
    },
    // Module 27 — Corridors logistiques : simple constat structurel, sans
    // règle de taxation inventée (cf. modèle Corridor).
    estTransfrontalier: {
      type: Boolean,
      default: false,
    },
    corridor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corridor",
      default: null,
    },
    statutDouane: {
      type: String,
      enum: ["non_applicable", "a_traiter_manuellement"],
      default: "non_applicable",
    },
    description: {
      type: String,
      trim: true,
    },
    poidsKg: {
      type: Number,
      default: 0,
    },
    distanceKm: {
      type: Number,
      default: 0,
    },
    optionExpress: {
      type: Boolean,
      default: false,
    },
    prix: {
      type: Number,
      required: true,
    },
    // Commission JMD Transport (V1 validée : 10 % du prix) — Étape 2, 04/08/2026
    commission: {
      type: Number,
      default: 0,
    },
    dateLivraisonPrevue: {
      type: Date,
      default: null,
    },
    retardDetecte: {
      type: Boolean,
      default: false,
    },
    annulation: {
      annulePar: { type: String, enum: ["client", "transporteur", "admin", null], default: null },
      motif: { type: String, default: null },
      horodatage: { type: Date, default: null },
    },
    // Module 19 — Évaluations : chaque partie ne peut noter qu'une fois,
    // uniquement une fois la livraison au statut "livree".
    evaluation: {
      clientVersTransporteur: {
        note: { type: Number, min: 1, max: 5, default: null },
        commentaire: { type: String, default: null },
        creeLe: { type: Date, default: null },
      },
      transporteurVersClient: {
        note: { type: Number, min: 1, max: 5, default: null },
        commentaire: { type: String, default: null },
        creeLe: { type: Date, default: null },
      },
    },
    // Module 12 — Signature électronique : preuve de livraison obligatoire
    // pour faire passer une mission au statut "livree" (validé le 05/08/2026 —
    // remplace la simple bascule manuelle de statut par un contrôle réel).
    preuveLivraison: {
      nomDestinataire: { type: String, default: null },
      signatureUrl: { type: String, default: null },
      photoUrl: { type: String, default: null },
      geolocalisation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
      horodatage: { type: Date, default: null },
    },
    modePaiement: {
      type: String,
      enum: ["orange_money", "moov_money", "wave", "especes"],
      default: "especes",
    },
    statutPaiement: {
      type: String,
      enum: ["en_attente", "paye", "echoue"],
      default: "en_attente",
    },
    statut: {
      type: String,
      enum: [
        "en_attente",      // créée, pas encore assignée
        "acceptee",        // un transporteur a accepté
        "en_cours",        // en cours de livraison
        "livree",          // livrée avec succès
        "annulee",         // annulée
      ],
      default: "en_attente",
    },
    // Historique des positions GPS pendant le trajet (rempli via Socket.io)
    positionsTrajet: [
      {
        lat: Number,
        lng: Number,
        horodatage: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Livraison", livraisonSchema);
