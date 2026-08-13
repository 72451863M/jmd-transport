const Notification = require("../models/Notification");

// @desc    Mes notifications, les plus récentes en premier
// @route   GET /api/notifications
// @access  Privé
const getMesNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ destinataire: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Nombre de notifications non lues
// @route   GET /api/notifications/non-lues/count
// @access  Privé
const getNombreNonLues = async (req, res) => {
  try {
    const notifications = await Notification.find({ destinataire: req.user._id, lu: false });
    return res.status(200).json({ count: notifications.length });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Marquer une notification comme lue
// @route   PATCH /api/notifications/:id/lu
// @access  Privé
const marquerCommeLue = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification introuvable" });
    }
    if (notification.destinataire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Cette notification ne vous appartient pas" });
    }
    notification.lu = true;
    await notification.save();
    return res.status(200).json(notification);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getMesNotifications, getNombreNonLues, marquerCommeLue };
