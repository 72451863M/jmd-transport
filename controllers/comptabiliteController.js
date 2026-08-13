const Livraison = require("../models/Livraison");
const Remboursement = require("../models/Remboursement");
const { enregistrerAudit } = require("../utils/audit");

// @desc    Confirmer manuellement qu'un paiement a été reçu (le système ne
//          traite aucun paiement réel — Module 13 — donc ceci enregistre une
//          confirmation faite en dehors de l'application).
// @route   PUT /api/comptabilite/livraisons/:id/statut-paiement
// @access  Privé (admin)
const modifierStatutPaiement = async (req, res) => {
  try {
    const { statutPaiement } = req.body;
    const statutsValides = ["en_attente", "paye", "echoue"];
    if (!statutsValides.includes(statutPaiement)) {
      return res.status(400).json({ message: "Statut de paiement invalide" });
    }

    const livraison = await Livraison.findById(req.params.id);
    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    livraison.statutPaiement = statutPaiement;
    await livraison.save();

    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "paiement",
      ressource: "Livraison",
      ressourceId: livraison._id,
      description: `Statut de paiement de la livraison ${livraison._id} changé en "${statutPaiement}"`,
    });

    return res.status(200).json(livraison);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Enregistrer un remboursement (décidé et versé hors application)
// @route   POST /api/comptabilite/remboursements
// @access  Privé (admin)
const creerRemboursement = async (req, res) => {
  try {
    const { livraisonId, reclamationId, montant, motif } = req.body;
    if (!livraisonId || !montant || !motif) {
      return res.status(400).json({ message: "La livraison, le montant et le motif sont obligatoires" });
    }
    if (Number(montant) <= 0) {
      return res.status(400).json({ message: "Le montant doit être positif" });
    }

    const livraison = await Livraison.findById(livraisonId);
    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    const remboursement = await Remboursement.create({
      livraison: livraisonId,
      reclamation: reclamationId || null,
      montant: Number(montant),
      motif,
      enregistrePar: req.user._id,
    });

    await enregistrerAudit({
      utilisateur: req.user._id,
      typeAction: "paiement",
      ressource: "Remboursement",
      ressourceId: remboursement._id,
      description: `Remboursement de ${montant} FCFA enregistré pour la livraison ${livraisonId} — motif : ${motif}`,
    });

    return res.status(201).json(remboursement);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Liste des remboursements enregistrés
// @route   GET /api/comptabilite/remboursements
// @access  Privé (admin)
const getRemboursements = async (req, res) => {
  try {
    const remboursements = await Remboursement.find({})
      .populate("livraison", "adresseDepart adresseArrivee prix")
      .sort({ createdAt: -1 });
    return res.status(200).json(remboursements);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Rapport financier : factures, commissions, paiements,
//          remboursements — agrégés sur toutes les livraisons livrées.
// @route   GET /api/comptabilite/rapport
// @access  Privé (admin)
const getRapportFinancier = async (req, res) => {
  try {
    const livraisonsLivrees = await Livraison.find({ statut: "livree" });

    const montantTotalFacture = livraisonsLivrees.reduce((total, l) => total + (l.prix || 0), 0);
    const commissionTotale = livraisonsLivrees.reduce((total, l) => total + (l.commission || 0), 0);

    const repartitionParStatutPaiement = { en_attente: 0, paye: 0, echoue: 0 };
    livraisonsLivrees.forEach((l) => {
      const statut = l.statutPaiement || "en_attente";
      repartitionParStatutPaiement[statut] = (repartitionParStatutPaiement[statut] || 0) + 1;
    });

    const remboursements = await Remboursement.find({});
    const montantTotalRembourse = remboursements.reduce((total, r) => total + (r.montant || 0), 0);

    return res.status(200).json({
      nbFactures: livraisonsLivrees.length,
      montantTotalFacture,
      commissionTotale,
      montantNetTransporteurs: montantTotalFacture - commissionTotale,
      repartitionParStatutPaiement,
      nbRemboursements: remboursements.length,
      montantTotalRembourse,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { modifierStatutPaiement, creerRemboursement, getRemboursements, getRapportFinancier };
