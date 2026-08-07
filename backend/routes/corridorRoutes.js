const express = require("express");
const router = express.Router();
const { getCorridors } = require("../controllers/corridorController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getCorridors);

module.exports = router;
