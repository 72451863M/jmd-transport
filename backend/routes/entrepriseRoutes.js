const express = require("express");
const router = express.Router();
const { creerEntreprise, getMonEntreprise, ajouterCollaborateur } = require("../controllers/entrepriseController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

// Retour Module 3 (08/08/2026) : le cahier des charges prévoit explicitement
// qu'un transporteur puisse « gérer son entreprise » — pas réservé aux
// clients.
router.post("/", protect, checkRole("client", "transporteur"), creerEntreprise);
router.get("/moi", protect, getMonEntreprise);
router.post("/collaborateurs", protect, ajouterCollaborateur);

module.exports = router;
