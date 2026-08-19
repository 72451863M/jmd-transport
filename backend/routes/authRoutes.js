const express = require("express");
const router = express.Router();
const { register, login, getMe, enregistrerPushToken, modifierMonProfil } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/push-token", protect, enregistrerPushToken);
router.put("/me", protect, modifierMonProfil);

module.exports = router;
