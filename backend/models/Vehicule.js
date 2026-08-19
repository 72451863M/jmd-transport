const mongoose = require("mongoose");

// Module — Gestion du parc automobile (rôle "Gestionnaire de flotte" du
// cahier des charges, Chapitre 2.10). Limite documentée : il n'existe pas
// encore de compte "chauffeur" séparé dans ce backend (seuls admin/client/
// transporteur existent) — le nom du chauffeur affecté à un véhicule est
// donc stocké en texte libre pour l'instant, pas relié à un vrai compte.
const vehiculeSchema = new mongoose.Schema(
  {
    proprietaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    immatriculation: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      // "citerne" et "frigorifique" ajoutés pour le Module 6 (Gestion des
      // marchandises) — nécessaires pour transporter légitimement des
      // produits pétroliers/dangereux et des produits réfrigérés.
      enum: ["moto", "camionnette", "camion", "semi_remorque", "citerne", "frigorifique"],
      required: true,
    },
    capaciteKg: {
      type: Number,
      required: true,
      min: 1,
    },
    nomChauffeur: {
      type: String,
      default: null,
      trim: true,
    },
    telephoneChauffeur: {
      type: String,
      default: null,
      trim: true,
    },
    actif: {
      type: Boolean,
      default: true,
    },
    // Module 26 — Maintenance de flotte : échéances réglementaires à
    // surveiller (jamais de date inventée par défaut — reste null tant que
    // le transporteur ne l'a pas renseignée) et kilométrage courant, utile
    // pour les entretiens programmés par intervalle de kilomètres (vidange
    // tous les X km, par exemple).
    dateProchainControleTechnique: {
      type: Date,
      default: null,
    },
    dateExpirationAssurance: {
      type: Date,
      default: null,
    },
    kilometrageActuel: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Un même transporteur ne peut pas enregistrer deux fois la même
// immatriculation (deux transporteurs différents pourraient théoriquement
// avoir le même numéro si l'un d'eux a fait une erreur de saisie — on ne
// bloque donc l'unicité qu'au sein d'un même compte, pas globalement).
vehiculeSchema.index({ proprietaire: 1, immatriculation: 1 }, { unique: true });

module.exports = mongoose.model("Vehicule", vehiculeSchema);
