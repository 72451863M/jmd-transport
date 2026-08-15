const express = require("express");
const router = express.Router();
const { ajouterMaintenance, getHistoriqueMaintenance, getEcheancesProches } = require("../controllers/maintenanceController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.post("/", protect, checkRole("transporteur"), ajouterMaintenance);
router.get("/echeances", protect, checkRole("transporteur"), getEcheancesProches);
router.get("/vehicules/:id", protect, checkRole("transporteur"), getHistoriqueMaintenance);

module.exports = router;
