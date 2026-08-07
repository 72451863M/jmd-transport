const User = require("../models/User");
const { recalculerScoresIA } = require("../jobs/recalculerScoresIA");

// @desc    Liste de tous les utilisateurs (admin)
// @route   GET /api/users
// @access  Privé (admin)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Liste des transporteurs disponibles, triés par score IA (Module 9
//          lit ici un score déjà calculé par le Module 21 — jamais de calcul
//          synchrone, cf. utils/scoreIA.js)
// @route   GET /api/users/transporteurs
// @access  Privé
const getTransporteurs = async (req, res) => {
  try {
    const transporteurs = await User.find({ role: "transporteur", actif: true })
      .select("-password")
      .sort({ scoreIA: -1 }); // les transporteurs sans score IA (null) apparaissent en dernier

    return res.status(200).json(transporteurs);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Déclencher manuellement le recalcul des scores IA (Module 21)
//          Normalement exécuté par jobs/recalculerScoresIA.js via cron ; cet
//          endpoint permet un déclenchement à la demande par un administrateur.
// @route   POST /api/users/scores-ia/recalculer
// @access  Privé (admin)
const declencherRecalculScoresIA = async (req, res) => {
  try {
    const resultat = await recalculerScoresIA();
    return res.status(200).json({
      message: `Scores IA recalculés : ${resultat.misAJour}/${resultat.traites} transporteurs mis à jour.`,
      ...resultat,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Mettre à jour la position GPS du transporteur connecté
// @route   PUT /api/users/position
// @access  Privé (transporteur)
const updatePosition = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: "lat et lng sont requis" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { position: { lat, lng, updatedAt: new Date() } },
      { new: true }
    ).select("-password");

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Activer / désactiver un utilisateur (admin)
// @route   PUT /api/users/:id/statut
// @access  Privé (admin)
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    user.actif = !user.actif;
    await user.save();
    return res.status(200).json({ message: `Utilisateur ${user.actif ? "activé" : "désactivé"}`, user });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getUsers, getTransporteurs, updatePosition, toggleUserStatus, declencherRecalculScoresIA };
