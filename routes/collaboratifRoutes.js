const express = require("express");
const router = express.Router();
const { getMonGroupe, getTousLesGroupes } = require("../controllers/collaboratifController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.get("/livraisons/:id/groupe", protect, getMonGroupe);
router.get("/groupes", protect, checkRole("admin"), getTousLesGroupes);

module.exports = router;
