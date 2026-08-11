const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom est requis"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    telephone: {
      type: String,
      required: [true, "Le numéro de téléphone est requis"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "client", "transporteur"],
      default: "client",
    },
    // Module 2 — Affiliation à une entreprise cliente (facultatif, clients uniquement)
    entreprise: {
      entrepriseId: { type: mongoose.Schema.Types.ObjectId, ref: "Entreprise", default: null },
      roleEntreprise: { type: String, enum: ["proprietaire", "collaborateur", null], default: null },
    },
    // Champs spécifiques au transporteur
    vehicule: {
      type: {
        type: String, // ex: "Moto", "Camionnette", "Camion"
      },
      immatriculation: String,
      capaciteKg: Number,
    },
    position: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    actif: {
      type: Boolean,
      default: true,
    },
    // KYC — Loi malienne n°2013-015 du 21/05/2013 et régulation APDP.
    // Règles validées le 04/08/2026 : consentement explicite obligatoire avant
    // toute collecte, documents requis selon le rôle, validation manuelle par
    // un administrateur sous 24-48h.
    kyc: {
      consentement: {
        donne: { type: Boolean, default: false },
        donneLe: { type: Date, default: null },
      },
      documents: [
        {
          type: {
            type: String,
            enum: ["cni_nina", "permis_conduire", "carte_grise", "rccm", "nif"],
            required: true,
          },
          url: { type: String, required: true },
          ajouteLe: { type: Date, default: Date.now },
        },
      ],
      statutGlobal: {
        type: String,
        enum: ["non_soumis", "incomplet", "en_attente_validation", "valide", "rejete"],
        default: "non_soumis",
      },
      valideParAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      valideLe: { type: Date, default: null },
      motifRejet: { type: String, default: null },
      derniereRelanceLe: { type: Date, default: null },
    },
    // Statistiques utilisées pour le calcul du score de fiabilité (transporteurs)
    // — Étape 2 / points validés le 04/08/2026
    statsFiabilite: {
      missionsCompletees: { type: Number, default: 0 },
      missionsALHeure: { type: Number, default: 0 },
      missionsAcceptees: { type: Number, default: 0 },
      missionsAnnuleesParTransporteur: { type: Number, default: 0 },
      sommeNotes: { type: Number, default: 0 },
      nbNotes: { type: Number, default: 0 },
    },
    // Score IA (Module 21) — calculé en tâche asynchrone/par lot, jamais en
    // synchrone au moment de l'attribution (découplage validé le 04/08/2026,
    // Étape 1 section 8 : risque de dépendance circulaire Module 9 ↔ Module 21).
    scoreIA: {
      type: Number,
      default: null,
    },
    scoreIACalculeLe: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash du mot de passe avant sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode pour comparer le mot de passe saisi avec le hash stocké
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Score de fiabilité transporteur (V1 validée le 04/08/2026) :
// 40% ponctualité + 30% taux d'acceptation (non-annulation) + 20% note moyenne + 10% ancienneté (plafonnée à 50 missions)
userSchema.methods.calculerScoreFiabilite = function () {
  const s = this.statsFiabilite || {};
  const completees = s.missionsCompletees || 0;
  const acceptees = s.missionsAcceptees || 0;
  const annulees = s.missionsAnnuleesParTransporteur || 0;
  const alHeure = s.missionsALHeure || 0;
  const nbNotes = s.nbNotes || 0;
  const sommeNotes = s.sommeNotes || 0;

  if (completees === 0 && acceptees === 0) return null; // pas encore assez d'historique

  const ponctualite = completees > 0 ? (alHeure / completees) * 100 : 0;
  const totalDecisions = acceptees + annulees;
  const tauxAcceptation = totalDecisions > 0 ? (acceptees / totalDecisions) * 100 : 100;
  const noteMoyenne = nbNotes > 0 ? (sommeNotes / nbNotes) * 20 : 60; // note sur 5 ramenée sur 100, défaut neutre
  const anciennete = Math.min(completees / 50, 1) * 100;

  const score = 0.4 * ponctualite + 0.3 * tauxAcceptation + 0.2 * noteMoyenne + 0.1 * anciennete;
  return Math.round(score * 10) / 10;
};

module.exports = mongoose.model("User", userSchema);
