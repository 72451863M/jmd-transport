const Chauffeur = require("../models/Chauffeur");
const Vehicule = require("../models/Vehicule");
const Livraison = require("../models/Livraison");
const { enregistrerAudit } = require("../utils/audit");

const CATEGORIES_PERMIS_VALIDES = ["A", "B", "C", "D", "E"];

// @desc    Ajouter un chauffeur
// @route   POST /api/chauffeurs
// @access  Privé (transporteur)
const ajouterChauffeur = async (req, res) => {
  try {
    const { nom, telephone, numeroPermis, categoriePermis, dateExpirationPermis, certificats } = req.body;
    if (!nom || !telephone) {
      return res.status(400).json({ message: "Le nom et le téléphone du chauffeur sont obligatoires" });
    }
    if (categoriePermis && !CATEGORIES_PERMIS_VALIDES.includes(categoriePermis)) {
      return res.status(400).json({ message: `Catégorie de permis invalide (attendu : ${CATEGORIES_PERMIS_VALIDES.join(", ")})` });
    }

    const chauffeur = await Chauffeur.create({
      proprietaire: req.user._id,
      nom: nom.trim(),
      telephone: telephone.trim(),
      numeroPermis: numeroPermis || null,
      categoriePermis: categoriePermis || null,
      dateExpirationPermis: dateExpirationPermis || null,
      certificats: Array.isArray(certificats) ? certificats : [],
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

    const { nom, telephone, numeroPermis, categoriePermis, dateExpirationPermis, certificats, disponibilite, actif } = req.body;
    if (nom !== undefined) chauffeur.nom = nom.trim();
    if (telephone !== undefined) chauffeur.telephone = telephone.trim();
    if (numeroPermis !== undefined) chauffeur.numeroPermis = numeroPermis || null;
    if (categoriePermis !== undefined) {
      if (categoriePermis && !CATEGORIES_PERMIS_VALIDES.includes(categoriePermis)) {
        return res.status(400).json({ message: `Catégorie de permis invalide (attendu : ${CATEGORIES_PERMIS_VALIDES.join(", ")})` });
      }
      chauffeur.categoriePermis = categoriePermis || null;
    }
    if (dateExpirationPermis !== undefined) chauffeur.dateExpirationPermis = dateExpirationPermis || null;
    if (certificats !== undefined) chauffeur.certificats = Array.isArray(certificats) ? certificats : chauffeur.certificats;
    if (disponibilite !== undefined) {
      const disponibilitesValides = ["disponible", "en_mission", "indisponible"];
      if (!disponibilitesValides.includes(disponibilite)) {
        return res.status(400).json({ message: "Disponibilité invalide" });
      }
      chauffeur.disponibilite = disponibilite;
    }
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

// @desc    Historique des missions d'un chauffeur (Module 4 — historique des
//          missions + notation agrégée)
// @route   GET /api/chauffeurs/:id/historique
// @access  Privé (transporteur, propriétaire uniquement)
const getHistoriqueMissions = async (req, res) => {
  try {
    const chauffeur = await Chauffeur.findById(req.params.id);
    if (!chauffeur) {
      return res.status(404).json({ message: "Chauffeur introuvable" });
    }
    if (chauffeur.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Ce chauffeur ne fait pas partie de ton équipe" });
    }

    const missions = await Livraison.find({ chauffeurUtilise: chauffeur._id }).sort({ createdAt: -1 });

    const noteMoyenne = chauffeur.statsMissions.nbNotes > 0
      ? Math.round((chauffeur.statsMissions.sommeNotes / chauffeur.statsMissions.nbNotes) * 10) / 10
      : null;

    return res.status(200).json({
      chauffeur: {
        _id: chauffeur._id,
        nom: chauffeur.nom,
        missionsCompletees: chauffeur.statsMissions.missionsCompletees,
        noteMoyenne,
        nbNotes: chauffeur.statsMissions.nbNotes,
      },
      missions: missions.map((m) => ({
        _id: m._id,
        adresseDepart: m.adresseDepart,
        adresseArrivee: m.adresseArrivee,
        statut: m.statut,
        prix: m.prix,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { ajouterChauffeur, getMesChauffeurs, modifierChauffeur, supprimerChauffeur, getHistoriqueMissions };
