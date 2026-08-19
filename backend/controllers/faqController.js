const FAQ = require("../models/FAQ");
const { rechercherDansFAQ } = require("../utils/chatbot");
const { enregistrerAudit } = require("../utils/audit");

// @desc    Liste des entrées FAQ actives, triées par ordre d'affichage
// @route   GET /api/faq
// @access  Privé (authentifié)
const getFAQ = async (req, res) => {
  try {
    const entrees = await FAQ.find({ actif: true }).sort({ ordre: 1, createdAt: 1 });
    return res.status(200).json(entrees);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    « Chatbot » — recherche par mots-clés dans la FAQ à partir d'une
//          question posée en langage libre. Pas de compréhension sémantique
//          réelle (voir utils/chatbot.js) : une simple recherche de
//          correspondance de mots-clés.
// @route   GET /api/faq/recherche?q=...
// @access  Privé (authentifié)
const rechercherAssistant = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: "Merci de préciser une question (paramètre q)" });
    }
    const entrees = await FAQ.find({ actif: true });
    const resultats = rechercherDansFAQ(q, entrees, 3);
    return res.status(200).json({
      resultats,
      aucuneCorrespondance: resultats.length === 0,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Toutes les entrées FAQ (y compris désactivées), pour la gestion admin
// @route   GET /api/faq/toutes
// @access  Privé (admin)
const getToutesFAQ = async (req, res) => {
  try {
    const entrees = await FAQ.find({}).sort({ ordre: 1, createdAt: 1 });
    return res.status(200).json(entrees);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Ajouter une entrée FAQ
// @route   POST /api/faq
// @access  Privé (admin)
const ajouterFAQ = async (req, res) => {
  try {
    const { question, reponse, categorie, ordre } = req.body;
    if (!question || !reponse) {
      return res.status(400).json({ message: "La question et la réponse sont obligatoires" });
    }
    const entree = await FAQ.create({ question, reponse, categorie, ordre });
    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "modification",
      ressource: "FAQ",
      ressourceId: entree._id,
      description: `Ajout d'une entrée FAQ : "${question}"`,
    });
    return res.status(201).json(entree);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Modifier une entrée FAQ
// @route   PUT /api/faq/:id
// @access  Privé (admin)
const modifierFAQ = async (req, res) => {
  try {
    const entree = await FAQ.findById(req.params.id);
    if (!entree) {
      return res.status(404).json({ message: "Entrée FAQ introuvable" });
    }
    const { question, reponse, categorie, ordre, actif } = req.body;
    if (question !== undefined) entree.question = question;
    if (reponse !== undefined) entree.reponse = reponse;
    if (categorie !== undefined) entree.categorie = categorie;
    if (ordre !== undefined) entree.ordre = ordre;
    if (actif !== undefined) entree.actif = !!actif;

    await entree.save();
    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "modification",
      ressource: "FAQ",
      ressourceId: entree._id,
      description: `Modification de l'entrée FAQ : "${entree.question}"`,
    });
    return res.status(200).json(entree);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Supprimer une entrée FAQ
// @route   DELETE /api/faq/:id
// @access  Privé (admin)
const supprimerFAQ = async (req, res) => {
  try {
    const entree = await FAQ.findById(req.params.id);
    if (!entree) {
      return res.status(404).json({ message: "Entrée FAQ introuvable" });
    }
    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "suppression",
      ressource: "FAQ",
      ressourceId: entree._id,
      description: `Suppression de l'entrée FAQ : "${entree.question}"`,
    });
    await entree.deleteOne();
    return res.status(200).json({ message: "Entrée FAQ supprimée" });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getFAQ, rechercherAssistant, getToutesFAQ, ajouterFAQ, modifierFAQ, supprimerFAQ };
