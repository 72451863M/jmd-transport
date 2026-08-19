const MaintenanceVehicule = require("../models/MaintenanceVehicule");
const Vehicule = require("../models/Vehicule");
const { enregistrerAudit } = require("../utils/audit");

const TYPES_MAINTENANCE_VALIDES = ["entretien", "vidange", "pneus", "reparation"];
const JOURS_ALERTE_ECHEANCE = 30; // échéance jugée "proche" si dans les 30 prochains jours

// @desc    Enregistrer une intervention de maintenance sur un véhicule
// @route   POST /api/maintenance
// @access  Privé (transporteur, propriétaire du véhicule uniquement)
const ajouterMaintenance = async (req, res) => {
  try {
    const { vehiculeId, type, description, dateRealisee, kilometrageAuMoment, cout, prochaineEcheanceDate, prochaineEcheanceKm } = req.body;

    if (!vehiculeId || !type || !description || !dateRealisee) {
      return res.status(400).json({ message: "Le véhicule, le type, la description et la date sont obligatoires" });
    }
    if (!TYPES_MAINTENANCE_VALIDES.includes(type)) {
      return res.status(400).json({ message: `Type de maintenance invalide (attendu : ${TYPES_MAINTENANCE_VALIDES.join(", ")})` });
    }

    const vehicule = await Vehicule.findById(vehiculeId);
    if (!vehicule) {
      return res.status(404).json({ message: "Véhicule introuvable" });
    }
    if (vehicule.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Ce véhicule ne fait pas partie de ta flotte" });
    }

    const intervention = await MaintenanceVehicule.create({
      vehicule: vehiculeId,
      type,
      description,
      dateRealisee,
      kilometrageAuMoment: kilometrageAuMoment || null,
      cout: cout || null,
      prochaineEcheanceDate: prochaineEcheanceDate || null,
      prochaineEcheanceKm: prochaineEcheanceKm || null,
      enregistrePar: req.user._id,
    });

    // Le kilométrage renseigné à cette occasion met à jour le compteur du
    // véhicule, s'il est plus récent que ce qui était connu.
    if (kilometrageAuMoment && (!vehicule.kilometrageActuel || kilometrageAuMoment > vehicule.kilometrageActuel)) {
      vehicule.kilometrageActuel = kilometrageAuMoment;
      await vehicule.save();
    }

    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "modification",
      ressource: "MaintenanceVehicule",
      ressourceId: intervention._id,
      description: `Intervention "${type}" enregistrée sur le véhicule ${vehicule.immatriculation}`,
    });

    return res.status(201).json(intervention);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Historique de maintenance d'un véhicule
// @route   GET /api/maintenance/vehicules/:id
// @access  Privé (transporteur, propriétaire du véhicule uniquement)
const getHistoriqueMaintenance = async (req, res) => {
  try {
    const vehicule = await Vehicule.findById(req.params.id);
    if (!vehicule) {
      return res.status(404).json({ message: "Véhicule introuvable" });
    }
    if (vehicule.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Ce véhicule ne fait pas partie de ta flotte" });
    }

    const interventions = await MaintenanceVehicule.find({ vehicule: vehicule._id }).sort({ dateRealisee: -1 });

    return res.status(200).json({
      vehicule: {
        _id: vehicule._id,
        immatriculation: vehicule.immatriculation,
        kilometrageActuel: vehicule.kilometrageActuel,
        dateProchainControleTechnique: vehicule.dateProchainControleTechnique,
        dateExpirationAssurance: vehicule.dateExpirationAssurance,
      },
      interventions,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Échéances réglementaires proches (contrôle technique, assurance)
//          sur toute la flotte du transporteur, pour un suivi rapide sans
//          avoir à ouvrir chaque véhicule un par un.
// @route   GET /api/maintenance/echeances
// @access  Privé (transporteur)
const getEcheancesProches = async (req, res) => {
  try {
    const dansNJours = new Date();
    dansNJours.setDate(dansNJours.getDate() + JOURS_ALERTE_ECHEANCE);

    const vehicules = await Vehicule.find({ proprietaire: req.user._id, actif: true });

    const echeances = [];
    vehicules.forEach((v) => {
      if (v.dateProchainControleTechnique && new Date(v.dateProchainControleTechnique) <= dansNJours) {
        echeances.push({
          vehiculeId: v._id,
          immatriculation: v.immatriculation,
          type: "controle_technique",
          date: v.dateProchainControleTechnique,
          depassee: new Date(v.dateProchainControleTechnique) < new Date(),
        });
      }
      if (v.dateExpirationAssurance && new Date(v.dateExpirationAssurance) <= dansNJours) {
        echeances.push({
          vehiculeId: v._id,
          immatriculation: v.immatriculation,
          type: "assurance",
          date: v.dateExpirationAssurance,
          depassee: new Date(v.dateExpirationAssurance) < new Date(),
        });
      }
    });

    echeances.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json({ joursAlerte: JOURS_ALERTE_ECHEANCE, echeances });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { ajouterMaintenance, getHistoriqueMaintenance, getEcheancesProches };
