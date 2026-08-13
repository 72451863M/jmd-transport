const express = require("express");
const router = express.Router();
const {
  getUsers,
  getTransporteurs,
  updatePosition,
  toggleUserStatus,
  declencherRecalculScoresIA,
  getMesPerformances,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.get("/", protect, checkRole("admin"), getUsers);
router.get("/transporteurs", protect, getTransporteurs);
router.get("/mes-performances", protect, checkRole("transporteur"), getMesPerformances);
router.put("/position", protect, checkRole("transporteur"), updatePosition);
router.put("/:id/statut", protect, checkRole("admin"), toggleUserStatus);
router.post("/scores-ia/recalculer", protect, checkRole("admin"), declencherRecalculScoresIA);

module.exports = router;
