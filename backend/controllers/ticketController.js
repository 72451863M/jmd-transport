const TicketAssistance = require("../models/TicketAssistance");
const { notifier } = require("../utils/notifications");
const { enregistrerAudit } = require("../utils/audit");

// @desc    Créer un ticket d'assistance
// @route   POST /api/tickets
// @access  Privé (authentifié)
const creerTicket = async (req, res) => {
  try {
    const { sujet, categorie, message } = req.body;
    if (!sujet || !message) {
      return res.status(400).json({ message: "Le sujet et un premier message sont obligatoires" });
    }

    const ticket = await TicketAssistance.create({
      auteur: req.user._id,
      sujet,
      categorie: categorie || "autre",
      messages: [{ auteur: req.user._id, role: req.user.role, texte: message }],
    });

    return res.status(201).json(ticket);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Mes tickets d'assistance
// @route   GET /api/tickets/mes-tickets
// @access  Privé (authentifié)
const getMesTickets = async (req, res) => {
  try {
    const tickets = await TicketAssistance.find({ auteur: req.user._id }).sort({ updatedAt: -1 });
    return res.status(200).json(tickets);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Tous les tickets (vue admin), filtrables par statut
// @route   GET /api/tickets?statut=ouvert
// @access  Privé (admin)
const getTousLesTickets = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) filtre.statut = req.query.statut;
    const tickets = await TicketAssistance.find(filtre)
      .populate("auteur", "nom email role")
      .sort({ updatedAt: -1 });
    return res.status(200).json(tickets);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Détail d'un ticket
// @route   GET /api/tickets/:id
// @access  Privé (auteur ou admin)
const getTicketById = async (req, res) => {
  try {
    const ticket = await TicketAssistance.findById(req.params.id).populate("auteur", "nom email role");
    if (!ticket) {
      return res.status(404).json({ message: "Ticket introuvable" });
    }
    const estAuteur = ticket.auteur._id.toString() === req.user._id.toString();
    if (!estAuteur && req.user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à consulter ce ticket" });
    }
    return res.status(200).json(ticket);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Ajouter un message à un ticket (auteur ou admin) — si l'admin
//          répond à un ticket encore "ouvert", il passe automatiquement à
//          "en_cours"
// @route   POST /api/tickets/:id/messages
// @access  Privé (auteur ou admin)
const ajouterMessage = async (req, res) => {
  try {
    const { texte } = req.body;
    if (!texte || !texte.trim()) {
      return res.status(400).json({ message: "Le message ne peut pas être vide" });
    }

    const ticket = await TicketAssistance.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket introuvable" });
    }
    const estAuteur = ticket.auteur.toString() === req.user._id.toString();
    if (!estAuteur && req.user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à répondre à ce ticket" });
    }
    if (ticket.statut === "ferme") {
      return res.status(400).json({ message: "Ce ticket est fermé — impossible d'ajouter un message" });
    }

    ticket.messages.push({ auteur: req.user._id, role: req.user.role, texte });
    if (req.user.role === "admin" && ticket.statut === "ouvert") {
      ticket.statut = "en_cours";
    }
    await ticket.save();

    if (req.user.role === "admin") {
      await notifier({
        destinataire: ticket.auteur,
        type: "reclamation_repondue", // type existant réutilisé : "votre demande a reçu une réponse"
        titre: "Réponse à ton ticket d'assistance",
        message: `Le support a répondu à ton ticket "${ticket.sujet}".`,
        lien: ticket._id.toString(),
      });
    }

    return res.status(200).json(ticket);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Changer le statut d'un ticket (résoudre, fermer, rouvrir)
// @route   PUT /api/tickets/:id/statut
// @access  Privé (auteur ou admin)
const changerStatutTicket = async (req, res) => {
  try {
    const { statut } = req.body;
    const statutsValides = ["ouvert", "en_cours", "resolu", "ferme"];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const ticket = await TicketAssistance.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket introuvable" });
    }
    const estAuteur = ticket.auteur.toString() === req.user._id.toString();
    if (!estAuteur && req.user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier ce ticket" });
    }
    // Seul l'admin peut fermer définitivement un ticket ; l'auteur peut le
    // marquer résolu ou le rouvrir, mais pas le fermer lui-même.
    if (statut === "ferme" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Seul un administrateur peut fermer définitivement un ticket" });
    }

    ticket.statut = statut;
    await ticket.save();

    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "modification",
      ressource: "TicketAssistance",
      ressourceId: ticket._id,
      description: `Statut du ticket "${ticket.sujet}" changé en "${statut}"`,
    });

    return res.status(200).json(ticket);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { creerTicket, getMesTickets, getTousLesTickets, getTicketById, ajouterMessage, changerStatutTicket };
