const Corridor = require("../models/Corridor");

// @desc    Liste des corridors logistiques actifs (données de référence)
// @route   GET /api/corridors
// @access  Privé
const getCorridors = async (req, res) => {
  try {
    const corridors = await Corridor.find({ actif: true });
    return res.status(200).json(corridors);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getCorridors };
