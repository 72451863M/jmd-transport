const express = require("express");
const router = express.Router();
const { register, login, getMe, enregistrerPushToken } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/push-token", protect, enregistrerPushToken);

module.exports = router;
