const Reclamation = require("../models/Reclamation");
const Livraison = require("../models/Livraison");
const { notifier } = require("../utils/notifications");

// @desc    Créer une réclamation liée à une livraison
// @route   POST /api/reclamations
// @access  Privé (client ou transporteur concerné par la livraison)
const creerReclamation = async (req, res) => {
  try {
    const { livraisonId, motif, description, pieceJointeUrl } = req.body;
    const motifsValides = ["retard", "marchandise_endommagee", "marchandise_manquante", "comportement", "paiement", "autre"];

    if (!livraisonId || !motifsValides.includes(motif) || !description) {
      return res.status(400).json({ message: "livraisonId, motif valide et description sont obligatoires" });
    }

    const livraison = await Livraison.findById(livraisonId);
    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    const estClient = livraison.client.toString() === req.user._id.toString();
    const estTransporteur =
      livraison.transporteur && livraison.transporteur.toString() === req.user._id.toString();

    if (!estClient && !estTransporteur) {
      return res.status(403).json({ message: "Vous n'êtes pas concerné par cette livraison" });
    }
    if (livraison.statut === "en_attente") {
      return res.status(400).json({ message: "Aucune réclamation possible sur une livraison pas encore assignée" });
    }

    const reclamation = await Reclamation.create({
      livraison: livraisonId,
      auteur: req.user._id,
      roleAuteur: estClient ? "client" : "transporteur",
      motif,
      description,
      pieceJointeUrl: pieceJointeUrl || null,
    });

    return res.status(201).json(reclamation);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Mes réclamations (celles que j'ai ouvertes)
// @route   GET /api/reclamations/mes
// @access  Privé
const getMesReclamations = async (req, res) => {
  try {
    const reclamations = await Reclamation.find({ auteur: req.user._id })
      .populate("livraison", "adresseDepart adresseArrivee statut")
      .sort({ createdAt: -1 });
    return res.status(200).json(reclamations);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Liste de toutes les réclamations, filtrable par statut
// @route   GET /api/reclamations?statut=ouverte
// @access  Privé (admin)
const getReclamations = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) filtre.statut = req.query.statut;

    const reclamations = await Reclamation.find(filtre)
      .populate("auteur", "nom telephone role")
      .populate("livraison", "adresseDepart adresseArrivee statut")
      .sort({ createdAt: -1 });

    return res.status(200).json(reclamations);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Répondre à une réclamation et mettre à jour son statut
// @route   PATCH /api/reclamations/:id/repondre
// @access  Privé (admin)
const repondreReclamation = async (req, res) => {
  try {
    const { texte, statut } = req.body;
    const statutsValides = ["en_cours", "resolue", "rejetee"];

    if (!texte || !statutsValides.includes(statut)) {
      return res.status(400).json({ message: "Une réponse et un statut valide (en_cours, resolue, rejetee) sont obligatoires" });
    }

    const reclamation = await Reclamation.findById(req.params.id);
    if (!reclamation) {
      return res.status(404).json({ message: "Réclamation introuvable" });
    }

    reclamation.reponse = { texte, adminId: req.user._id, repondueLe: new Date() };
    reclamation.statut = statut;
    await reclamation.save();

    await notifier({
      destinataire: reclamation.auteur,
      type: "reclamation_repondue",
      titre: "Réponse à votre réclamation",
      message: texte,
      lien: reclamation._id.toString(),
    });

    return res.status(200).json(reclamation);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { creerReclamation, getMesReclamations, getReclamations, repondreReclamation };
