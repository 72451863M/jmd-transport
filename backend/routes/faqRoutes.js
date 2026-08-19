const express = require("express");
const router = express.Router();
const { getFAQ, rechercherAssistant, getToutesFAQ, ajouterFAQ, modifierFAQ, supprimerFAQ } = require("../controllers/faqController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.get("/", protect, getFAQ);
router.get("/recherche", protect, rechercherAssistant);
router.get("/toutes", protect, checkRole("admin"), getToutesFAQ);
router.post("/", protect, checkRole("admin"), ajouterFAQ);
router.put("/:id", protect, checkRole("admin"), modifierFAQ);
router.delete("/:id", protect, checkRole("admin"), supprimerFAQ);

module.exports = router;
