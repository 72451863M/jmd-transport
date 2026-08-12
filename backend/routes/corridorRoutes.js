const express = require("express");
const router = express.Router();
const { getCorridors, modifierTaxeCorridor } = require("../controllers/corridorController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.get("/", protect, getCorridors);
router.put("/:id/taxe", protect, checkRole("admin"), modifierTaxeCorridor);

module.exports = router;
