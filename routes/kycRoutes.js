const express = require("express");
const router = express.Router();
const {
  donnerConsentement,
  ajouterDocument,
  getMonStatutKYC,
  getDossiersEnAttente,
  getDossiersIncomplets,
  validerKYC,
  rejeterKYC,
  relancerKYC,
} = require("../controllers/kycController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.post("/consentement", protect, donnerConsentement);
router.post("/documents", protect, ajouterDocument);
router.get("/statut", protect, getMonStatutKYC);
router.get("/en-attente", protect, checkRole("admin"), getDossiersEnAttente);
router.get("/incomplets", protect, checkRole("admin"), getDossiersIncomplets);
router.patch("/:userId/valider", protect, checkRole("admin"), validerKYC);
router.patch("/:userId/rejeter", protect, checkRole("admin"), rejeterKYC);
router.post("/:userId/relancer", protect, checkRole("admin"), relancerKYC);

module.exports = router;
