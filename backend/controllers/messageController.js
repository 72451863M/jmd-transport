const Message = require("../models/Message");
const Livraison = require("../models/Livraison");
const { notifier } = require("../utils/notifications");

async function trouverLivraisonEtRole(livraisonId, userId) {
  const livraison = await Livraison.findById(livraisonId);
  if (!livraison) return { livraison: null };

  const estClient = livraison.client.toString() === userId.toString();
  const estTransporteur = livraison.transporteur && livraison.transporteur.toString() === userId.toString();

  return { livraison, estClient, estTransporteur };
}

// @desc    Envoyer un message lié à une livraison (canal interne, sans
//          échange de numéro de téléphone)
// @route   POST /api/livraisons/:id/messages
// @access  Privé (client ou transporteur de la livraison, une fois assignée)
const envoyerMessage = async (req, res) => {
  try {
    const { texte } = req.body;
    if (!texte || !texte.trim()) {
      return res.status(400).json({ message: "Le message ne peut pas être vide" });
    }

    const { livraison, estClient, estTransporteur } = await trouverLivraisonEtRole(req.params.id, req.user._id);
    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }
    if (!estClient && !estTransporteur) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à écrire sur cette livraison" });
    }
    if (!livraison.transporteur) {
      return res.status(400).json({
        message: "La messagerie s'ouvre une fois qu'un transporteur a accepté la mission",
      });
    }

    const destinataireId = estClient ? livraison.transporteur : livraison.client;

    const message = await Message.create({
      livraison: livraison._id,
      expediteur: req.user._id,
      destinataire: destinataireId,
      texte: texte.trim(),
    });

    await notifier({
      destinataire: destinataireId,
      type: "message_recu",
      titre: "Nouveau message",
      message: texte.trim().slice(0, 80),
      lien: livraison._id.toString(),
    });

    return res.status(201).json(message);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Historique des messages d'une livraison
// @route   GET /api/livraisons/:id/messages
// @access  Privé (client, transporteur assigné, ou admin)
const getMessagesLivraison = async (req, res) => {
  try {
    const { livraison, estClient, estTransporteur } = await trouverLivraisonEtRole(req.params.id, req.user._id);
    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }
    if (!estClient && !estTransporteur && req.user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à consulter cette conversation" });
    }

    const messages = await Message.find({ livraison: req.params.id })
      .populate("expediteur", "nom role")
      .sort({ createdAt: 1 });

    // Marque comme lus les messages adressés à l'utilisateur courant
    await Message.updateMany(
      { livraison: req.params.id, destinataire: req.user._id, lu: false },
      { $set: { lu: true } }
    );

    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { envoyerMessage, getMessagesLivraison };
