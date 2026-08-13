const express = require("express");
const router = express.Router();
const {
  creerReclamation,
  getMesReclamations,
  getReclamations,
  repondreReclamation,
} = require("../controllers/reclamationController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.post("/", protect, creerReclamation);
router.get("/mes", protect, getMesReclamations);
router.get("/", protect, checkRole("admin"), getReclamations);
router.patch("/:id/repondre", protect, checkRole("admin"), repondreReclamation);

module.exports = router;
