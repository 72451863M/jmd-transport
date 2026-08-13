const mongoose = require("mongoose");

// Module 28 — Centre d'assistance : FAQ
const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    reponse: {
      type: String,
      required: true,
      trim: true,
    },
    categorie: {
      type: String,
      default: "Général",
      trim: true,
    },
    ordre: {
      type: Number,
      default: 0,
    },
    actif: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FAQ", faqSchema);
