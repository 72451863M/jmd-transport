const Chauffeur = require("../models/Chauffeur");
const Vehicule = require("../models/Vehicule");
const { enregistrerAudit } = require("../utils/audit");

// @desc    Ajouter un chauffeur
// @route   POST /api/chauffeurs
// @access  Privé (transporteur)
const ajouterChauffeur = async (req, res) => {
  try {
    const { nom, telephone, numeroPermis } = req.body;
    if (!nom || !telephone) {
      return res.status(400).json({ message: "Le nom et le téléphone du chauffeur sont obligatoires" });
    }

    const chauffeur = await Chauffeur.create({
      proprietaire: req.user._id,
      nom: nom.trim(),
      telephone: telephone.trim(),
      numeroPermis: numeroPermis || null,
    });

    return res.status(201).json(chauffeur);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Liste de mes chauffeurs
// @route   GET /api/chauffeurs
// @access  Privé (transporteur)
const getMesChauffeurs = async (req, res) => {
  try {
    const chauffeurs = await Chauffeur.find({ proprietaire: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(chauffeurs);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Modifier un chauffeur
// @route   PUT /api/chauffeurs/:id
// @access  Privé (transporteur, propriétaire uniquement)
const modifierChauffeur = async (req, res) => {
  try {
    const chauffeur = await Chauffeur.findById(req.params.id);
    if (!chauffeur) {
      return res.status(404).json({ message: "Chauffeur introuvable" });
    }
    if (chauffeur.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Ce chauffeur ne fait pas partie de ton équipe" });
    }

    const { nom, telephone, numeroPermis, actif } = req.body;
    if (nom !== undefined) chauffeur.nom = nom.trim();
    if (telephone !== undefined) chauffeur.telephone = telephone.trim();
    if (numeroPermis !== undefined) chauffeur.numeroPermis = numeroPermis || null;
    if (actif !== undefined) chauffeur.actif = !!actif;

    await chauffeur.save();
    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "modification",
      ressource: "Chauffeur",
      ressourceId: chauffeur._id,
      description: `Modification du chauffeur ${chauffeur.nom}`,
    });
    return res.status(200).json(chauffeur);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Retirer un chauffeur de son équipe
// @route   DELETE /api/chauffeurs/:id
// @access  Privé (transporteur, propriétaire uniquement)
const supprimerChauffeur = async (req, res) => {
  try {
    const chauffeur = await Chauffeur.findById(req.params.id);
    if (!chauffeur) {
      return res.status(404).json({ message: "Chauffeur introuvable" });
    }
    if (chauffeur.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Ce chauffeur ne fait pas partie de ton équipe" });
    }

    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "suppression",
      ressource: "Chauffeur",
      ressourceId: chauffeur._id,
      description: `Suppression du chauffeur ${chauffeur.nom}`,
    });
    await chauffeur.deleteOne();
    return res.status(200).json({ message: "Chauffeur retiré" });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { ajouterChauffeur, getMesChauffeurs, modifierChauffeur, supprimerChauffeur };
