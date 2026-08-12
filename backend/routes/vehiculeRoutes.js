const express = require("express");
const router = express.Router();
const { ajouterVehicule, getMesVehicules, modifierVehicule, supprimerVehicule } = require("../controllers/vehiculeController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.post("/", protect, checkRole("transporteur"), ajouterVehicule);
router.get("/", protect, checkRole("transporteur"), getMesVehicules);
router.put("/:id", protect, checkRole("transporteur"), modifierVehicule);
router.delete("/:id", protect, checkRole("transporteur"), supprimerVehicule);

module.exports = router;
