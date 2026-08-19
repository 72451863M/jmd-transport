const mongoose = require("mongoose");

// Module 26 — Maintenance de flotte
//
// Journal des interventions de maintenance par véhicule (entretiens,
// vidanges, pneus, réparations). Les échéances réglementaires (contrôle
// technique, assurance) sont suivies directement sur le véhicule
// (models/Vehicule.js) plutôt qu'ici, car ce sont des dates uniques à
// surveiller, pas un historique d'événements passés.
const maintenanceVehiculeSchema = new mongoose.Schema(
  {
    vehicule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicule",
      required: true,
    },
    type: {
      type: String,
      enum: ["entretien", "vidange", "pneus", "reparation"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    dateRealisee: {
      type: Date,
      required: true,
    },
    kilometrageAuMoment: {
      type: Number,
      default: null,
    },
    cout: {
      type: Number,
      default: null,
    },
    prochaineEcheanceDate: {
      type: Date,
      default: null,
    },
    prochaineEcheanceKm: {
      type: Number,
      default: null,
    },
    enregistrePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

maintenanceVehiculeSchema.index({ vehicule: 1, dateRealisee: -1 });

module.exports = mongoose.model("MaintenanceVehicule", maintenanceVehiculeSchema);
