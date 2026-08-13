const express = require("express");
const router = express.Router();
const { getStatistiques, getZonesPopulaires, getClassementTransporteurs } = require("../controllers/biController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.get("/statistiques", protect, checkRole("admin"), getStatistiques);
router.get("/zones-populaires", protect, checkRole("admin"), getZonesPopulaires);
router.get("/classement-transporteurs", protect, checkRole("admin"), getClassementTransporteurs);

module.exports = router;
