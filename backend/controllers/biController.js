const Livraison = require("../models/Livraison");
const User = require("../models/User");

// Module 22 — Business Intelligence (V1)
//
// Implémentation en agrégation JS plutôt qu'en pipeline MongoDB natif : plus
// simple à lire et à tester pour un volume de données de lancement (MVP).
// À reconsidérer pour un pipeline d'agrégation natif si le volume de
// livraisons devient significatif (des dizaines de milliers de documents).

// @desc    Statistiques globales : revenus, commissions, répartition par statut
// @route   GET /api/bi/statistiques
// @access  Privé (admin)
const getStatistiques = async (req, res) => {
  try {
    const livraisons = await Livraison.find({});

    const parStatut = {};
    let revenuTotal = 0;
    let commissionTotale = 0;
    let nbTransfrontalier = 0;

    for (const l of livraisons) {
      parStatut[l.statut] = (parStatut[l.statut] || 0) + 1;
      if (l.statut === "livree") {
        revenuTotal += l.prix || 0;
        commissionTotale += l.commission || 0;
      }
      if (l.estTransfrontalier) nbTransfrontalier++;
    }

    return res.status(200).json({
      nbLivraisonsTotal: livraisons.length,
      parStatut,
      revenuTotal,
      commissionTotale,
      nbTransfrontalier,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Zones les plus demandées (villes de départ et d'arrivée les plus fréquentes)
// @route   GET /api/bi/zones-populaires
// @access  Privé (admin)
const getZonesPopulaires = async (req, res) => {
  try {
    const livraisons = await Livraison.find({});

    const compterOccurrences = (champ) => {
      const compteur = {};
      for (const l of livraisons) {
        const label = l[champ]?.label;
        if (!label) continue;
        compteur[label] = (compteur[label] || 0) + 1;
      }
      return Object.entries(compteur)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    };

    return res.status(200).json({
      departsPopulaires: compterOccurrences("adresseDepart"),
      arriveesPopulaires: compterOccurrences("adresseArrivee"),
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Classement des transporteurs par missions complétées et score
// @route   GET /api/bi/classement-transporteurs
// @access  Privé (admin)
const getClassementTransporteurs = async (req, res) => {
  try {
    const transporteurs = await User.find({ role: "transporteur" });

    const classement = transporteurs
      .map((t) => ({
        id: t._id,
        nom: t.nom,
        missionsCompletees: t.statsFiabilite?.missionsCompletees || 0,
        scoreFiabilite: typeof t.calculerScoreFiabilite === "function" ? t.calculerScoreFiabilite() : null,
        scoreIA: t.scoreIA ?? null,
      }))
      .sort((a, b) => b.missionsCompletees - a.missionsCompletees)
      .slice(0, 10);

    return res.status(200).json(classement);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getStatistiques, getZonesPopulaires, getClassementTransporteurs };
