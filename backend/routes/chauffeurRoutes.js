const express = require("express");
const router = express.Router();
const { ajouterChauffeur, getMesChauffeurs, modifierChauffeur, supprimerChauffeur, getHistoriqueMissions } = require("../controllers/chauffeurController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.post("/", protect, checkRole("transporteur"), ajouterChauffeur);
router.get("/", protect, checkRole("transporteur"), getMesChauffeurs);
router.put("/:id", protect, checkRole("transporteur"), modifierChauffeur);
router.delete("/:id", protect, checkRole("transporteur"), supprimerChauffeur);
router.get("/:id/historique", protect, checkRole("transporteur"), getHistoriqueMissions);

module.exports = router;
