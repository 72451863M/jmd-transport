const Corridor = require("../models/Corridor");

// @desc    Liste des corridors logistiques actifs (données de référence)
// @route   GET /api/corridors
// @access  Privé
const getCorridors = async (req, res) => {
  try {
    const corridors = await Corridor.find({ actif: true });
    return res.status(200).json(corridors);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Enregistrer le taux de taxe/douane validé pour un corridor (Module
//          24 — gestion des taxes). Ne calcule ni n'invente aucune valeur :
//          l'admin saisit un chiffre qu'il a fait valider en amont.
// @route   PUT /api/corridors/:id/taxe
// @access  Privé (admin)
const modifierTaxeCorridor = async (req, res) => {
  try {
    const { tauxTaxeDouane, noteReglementaire } = req.body;

    if (tauxTaxeDouane !== undefined && tauxTaxeDouane !== null) {
      const taux = Number(tauxTaxeDouane);
      if (Number.isNaN(taux) || taux < 0 || taux > 1) {
        return res.status(400).json({ message: "Le taux de taxe doit être un nombre entre 0 et 1 (ex. 0.05 pour 5%)" });
      }
    }

    const corridor = await Corridor.findById(req.params.id);
    if (!corridor) {
      return res.status(404).json({ message: "Corridor introuvable" });
    }

    if (tauxTaxeDouane !== undefined) corridor.tauxTaxeDouane = tauxTaxeDouane === null ? null : Number(tauxTaxeDouane);
    if (noteReglementaire !== undefined) corridor.noteReglementaire = noteReglementaire;

    await corridor.save();
    return res.status(200).json(corridor);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getCorridors, modifierTaxeCorridor };
