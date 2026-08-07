const express = require("express");
const router = express.Router();
const { getMesNotifications, getNombreNonLues, marquerCommeLue } = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getMesNotifications);
router.get("/non-lues/count", protect, getNombreNonLues);
router.patch("/:id/lu", protect, marquerCommeLue);

module.exports = router;
