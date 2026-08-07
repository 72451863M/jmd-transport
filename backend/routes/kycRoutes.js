const express = require("express");
const router = express.Router();
const {
  donnerConsentement,
  ajouterDocument,
  getMonStatutKYC,
  getDossiersEnAttente,
  validerKYC,
  rejeterKYC,
} = require("../controllers/kycController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.post("/consentement", protect, donnerConsentement);
router.post("/documents", protect, ajouterDocument);
router.get("/statut", protect, getMonStatutKYC);
router.get("/en-attente", protect, checkRole("admin"), getDossiersEnAttente);
router.patch("/:userId/valider", protect, checkRole("admin"), validerKYC);
router.patch("/:userId/rejeter", protect, checkRole("admin"), rejeterKYC);

module.exports = router;
