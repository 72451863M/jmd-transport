const JournalAudit = require("../models/JournalAudit");

// @desc    Consulter le journal d'audit, filtrable par type d'action et par
//          utilisateur, trié du plus récent au plus ancien.
// @route   GET /api/audit
// @access  Privé (admin)
const getJournalAudit = async (req, res) => {
  try {
    const { typeAction, utilisateur, limite } = req.query;
    const filtre = {};
    if (typeAction) filtre.typeAction = typeAction;
    if (utilisateur) filtre.utilisateur = utilisateur;

    const entrees = await JournalAudit.find(filtre)
      .populate("utilisateur", "nom email role")
      .sort({ createdAt: -1 })
      .limit(Number(limite) || 100);

    return res.status(200).json(entrees);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getJournalAudit };
