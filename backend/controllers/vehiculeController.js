const Vehicule = require("../models/Vehicule");
const Livraison = require("../models/Livraison");
const { enregistrerAudit } = require("../utils/audit");

const TYPES_VEHICULE_VALIDES = ["moto", "camionnette", "camion", "semi_remorque", "citerne", "frigorifique"];

// @desc    Ajouter un véhicule à sa flotte
// @route   POST /api/vehicules
// @access  Privé (transporteur)
const ajouterVehicule = async (req, res) => {
  try {
    const { immatriculation, type, capaciteKg, nomChauffeur, telephoneChauffeur } = req.body;
    const typesValides = TYPES_VEHICULE_VALIDES;

    if (!immatriculation || !typesValides.includes(type) || !capaciteKg || capaciteKg <= 0) {
      return res.status(400).json({ message: "Immatriculation, type de véhicule et capacité (kg) sont obligatoires" });
    }

    const immatriculationNormalisee = immatriculation.trim().toUpperCase();

    const dejaExistant = await Vehicule.findOne({
      proprietaire: req.user._id,
      immatriculation: immatriculationNormalisee,
    });
    if (dejaExistant) {
      return res.status(400).json({ message: "Un véhicule avec cette immatriculation existe déjà dans ta flotte" });
    }

    const vehicule = await Vehicule.create({
      proprietaire: req.user._id,
      immatriculation: immatriculationNormalisee,
      type,
      capaciteKg,
      nomChauffeur: nomChauffeur || null,
      telephoneChauffeur: telephoneChauffeur || null,
    });

    return res.status(201).json(vehicule);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Liste des véhicules de ma flotte
// @route   GET /api/vehicules
// @access  Privé (transporteur)
const getMesVehicules = async (req, res) => {
  try {
    const vehicules = await Vehicule.find({ proprietaire: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(vehicules);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Modifier un véhicule (chauffeur affecté, capacité, activer/désactiver)
// @route   PUT /api/vehicules/:id
// @access  Privé (transporteur, propriétaire du véhicule uniquement)
const modifierVehicule = async (req, res) => {
  try {
    const vehicule = await Vehicule.findById(req.params.id);
    if (!vehicule) {
      return res.status(404).json({ message: "Véhicule introuvable" });
    }
    if (vehicule.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Ce véhicule ne t'appartient pas" });
    }

    const { nomChauffeur, telephoneChauffeur, capaciteKg, actif, dateProchainControleTechnique, dateExpirationAssurance, kilometrageActuel } = req.body;
    if (nomChauffeur !== undefined) vehicule.nomChauffeur = nomChauffeur || null;
    if (telephoneChauffeur !== undefined) vehicule.telephoneChauffeur = telephoneChauffeur || null;
    if (capaciteKg !== undefined) {
      if (capaciteKg <= 0) return res.status(400).json({ message: "La capacité doit être positive" });
      vehicule.capaciteKg = capaciteKg;
    }
    if (actif !== undefined) vehicule.actif = !!actif;
    // Module 26 — Maintenance de flotte
    if (dateProchainControleTechnique !== undefined) vehicule.dateProchainControleTechnique = dateProchainControleTechnique || null;
    if (dateExpirationAssurance !== undefined) vehicule.dateExpirationAssurance = dateExpirationAssurance || null;
    if (kilometrageActuel !== undefined) {
      if (kilometrageActuel < 0) return res.status(400).json({ message: "Le kilométrage ne peut pas être négatif" });
      vehicule.kilometrageActuel = kilometrageActuel;
    }

    await vehicule.save();
    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "modification",
      ressource: "Vehicule",
      ressourceId: vehicule._id,
      description: `Modification du véhicule ${vehicule.immatriculation}`,
    });
    return res.status(200).json(vehicule);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Retirer un véhicule de sa flotte
// @route   DELETE /api/vehicules/:id
// @access  Privé (transporteur, propriétaire du véhicule uniquement)
const supprimerVehicule = async (req, res) => {
  try {
    const vehicule = await Vehicule.findById(req.params.id);
    if (!vehicule) {
      return res.status(404).json({ message: "Véhicule introuvable" });
    }
    if (vehicule.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Ce véhicule ne t'appartient pas" });
    }

    // On vérifie qu'aucune mission en cours n'utilise ce véhicule avant de le
    // retirer, pour ne pas perdre la traçabilité d'une livraison active.
    const missionEnCours = await Livraison.findOne({
      vehiculeUtilise: vehicule._id,
      statut: { $in: ["acceptee", "en_cours"] },
    });
    if (missionEnCours) {
      return res.status(400).json({
        message: "Ce véhicule est utilisé sur une mission en cours — désactive-le plutôt que de le supprimer",
      });
    }

    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "suppression",
      ressource: "Vehicule",
      ressourceId: vehicule._id,
      description: `Suppression du véhicule ${vehicule.immatriculation}`,
    });
    await vehicule.deleteOne();
    return res.status(200).json({ message: "Véhicule retiré de la flotte" });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { ajouterVehicule, getMesVehicules, modifierVehicule, supprimerVehicule };
