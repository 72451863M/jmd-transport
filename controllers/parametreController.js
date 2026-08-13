const Parametre = require("../models/Parametre");
const { enregistrerAudit } = require("../utils/audit");

// Récupère le document de paramètres global, le crée avec les valeurs par
// défaut s'il n'existe pas encore (premier accès sur une installation neuve).
async function recupererOuCreerParametres() {
  let parametres = await Parametre.findById("global");
  if (!parametres) {
    parametres = await Parametre.create({ _id: "global" });
  }
  return parametres;
}

// @desc    Lire les paramètres système actuels
// @route   GET /api/parametres
// @access  Privé (authentifié — le taux de commission et les pays actifs
//          sont nécessaires côté client pour afficher des informations
//          cohérentes, pas seulement à l'admin)
const getParametres = async (req, res) => {
  try {
    const parametres = await recupererOuCreerParametres();
    return res.status(200).json(parametres);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Modifier les paramètres système
// @route   PUT /api/parametres
// @access  Privé (admin)
const modifierParametres = async (req, res) => {
  try {
    const { tauxCommission, paysActifs, devise } = req.body;

    if (tauxCommission !== undefined) {
      const taux = Number(tauxCommission);
      if (Number.isNaN(taux) || taux < 0 || taux > 1) {
        return res.status(400).json({ message: "Le taux de commission doit être un nombre entre 0 et 1 (ex. 0.10 pour 10%)" });
      }
    }
    if (paysActifs !== undefined && (!Array.isArray(paysActifs) || paysActifs.length === 0)) {
      return res.status(400).json({ message: "La liste des pays actifs doit contenir au moins un pays" });
    }

    const parametres = await recupererOuCreerParametres();
    if (tauxCommission !== undefined) parametres.tauxCommission = Number(tauxCommission);
    if (paysActifs !== undefined) parametres.paysActifs = paysActifs;
    if (devise !== undefined) parametres.devise = devise;
    parametres.modifieParAdminId = req.user._id;

    await parametres.save();
    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "modification",
      ressource: "Parametre",
      ressourceId: parametres._id,
      description: "Modification des paramètres système",
    });
    return res.status(200).json(parametres);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getParametres, modifierParametres, recupererOuCreerParametres };
