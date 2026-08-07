const express = require("express");
const router = express.Router();
const { creerEntreprise, getMonEntreprise, ajouterCollaborateur } = require("../controllers/entrepriseController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.post("/", protect, checkRole("client"), creerEntreprise);
router.get("/moi", protect, getMonEntreprise);
router.post("/collaborateurs", protect, ajouterCollaborateur);

module.exports = router;
