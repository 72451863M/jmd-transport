const express = require("express");
const router = express.Router();
const {
  modifierStatutPaiement,
  creerRemboursement,
  getRemboursements,
  getRapportFinancier,
} = require("../controllers/comptabiliteController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.put("/livraisons/:id/statut-paiement", protect, checkRole("admin"), modifierStatutPaiement);
router.post("/remboursements", protect, checkRole("admin"), creerRemboursement);
router.get("/remboursements", protect, checkRole("admin"), getRemboursements);
router.get("/rapport", protect, checkRole("admin"), getRapportFinancier);

module.exports = router;
