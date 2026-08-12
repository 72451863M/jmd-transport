const express = require("express");
const router = express.Router();
const { getParametres, modifierParametres } = require("../controllers/parametreController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.get("/", protect, getParametres);
router.put("/", protect, checkRole("admin"), modifierParametres);

module.exports = router;
