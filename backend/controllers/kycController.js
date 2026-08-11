const User = require("../models/User");
const { DOCUMENTS_REQUIS_PAR_ROLE, verifierDossierComplet } = require("../utils/kyc");
const { notifier } = require("../utils/notifications");

// @desc    Enregistrer le consentement explicite avant toute collecte de
//          pièce d'identité (obligatoire — Loi n°2013-015)
// @route   POST /api/kyc/consentement
// @access  Privé
const donnerConsentement = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.kyc.consentement = { donne: true, donneLe: new Date() };
    await user.save();
    return res.status(200).json({ message: "Consentement enregistré", kyc: user.kyc });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Ajouter un document KYC (l'upload du fichier lui-même se fait côté
//          client vers Cloudinary ; cet endpoint enregistre l'URL obtenue)
// @route   POST /api/kyc/documents
// @access  Privé
const ajouterDocument = async (req, res) => {
  try {
    const { type, url } = req.body;
    const typesValides = ["cni_nina", "permis_conduire", "carte_grise", "rccm", "nif"];

    if (!typesValides.includes(type) || !url) {
      return res.status(400).json({ message: "Type de document ou URL invalide" });
    }

    const user = await User.findById(req.user._id);

    if (!user.kyc.consentement.donne) {
      return res.status(400).json({
        message: "Le consentement doit être donné avant tout dépôt de document (POST /api/kyc/consentement).",
      });
    }

    // Remplace un document existant du même type plutôt que de le dupliquer
    user.kyc.documents = user.kyc.documents.filter((d) => d.type !== type);
    user.kyc.documents.push({ type, url, ajouteLe: new Date() });

    const { complet } = verifierDossierComplet(user);
    user.kyc.statutGlobal = complet ? "en_attente_validation" : "incomplet";

    await user.save();
    return res.status(200).json({ message: "Document ajouté", kyc: user.kyc });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Consulter son propre statut KYC (documents requis, manquants, statut)
// @route   GET /api/kyc/statut
// @access  Privé
const getMonStatutKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { complet, manquants } = verifierDossierComplet(user);
    return res.status(200).json({
      statutGlobal: user.kyc.statutGlobal,
      documentsRequis: DOCUMENTS_REQUIS_PAR_ROLE[user.role] || DOCUMENTS_REQUIS_PAR_ROLE.client,
      documentsDeposes: user.kyc.documents.map((d) => d.type),
      documentsManquants: manquants,
      dossierComplet: complet,
      motifRejet: user.kyc.motifRejet,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Liste des dossiers KYC en attente de validation
// @route   GET /api/kyc/en-attente
// @access  Privé (admin)
const getDossiersEnAttente = async (req, res) => {
  try {
    const users = await User.find({ "kyc.statutGlobal": "en_attente_validation" }).select(
      "nom email telephone role kyc"
    );
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Valider le dossier KYC d'un utilisateur
// @route   PATCH /api/kyc/:userId/valider
// @access  Privé (admin) — validation manuelle sous 24-48h (règle validée le 04/08/2026)
const validerKYC = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    const { complet } = verifierDossierComplet(user);
    if (!complet) {
      return res.status(400).json({ message: "Le dossier n'est pas complet, validation impossible" });
    }

    user.kyc.statutGlobal = "valide";
    user.kyc.valideParAdminId = req.user._id;
    user.kyc.valideLe = new Date();
    user.kyc.motifRejet = null;
    await user.save();

    // Traçabilité (Module 25 — Audit) : à brancher sur le futur journal d'audit centralisé.
    console.log(`[AUDIT] KYC validé pour ${user.email} par admin ${req.user.email} le ${new Date().toISOString()}`);

    await notifier({
      destinataire: user._id,
      type: "kyc_valide",
      titre: "Vérification d'identité validée",
      message: "Ton dossier KYC a été validé. Tu as maintenant accès à toutes les fonctionnalités de la plateforme.",
    });

    return res.status(200).json({ message: "Dossier KYC validé", kyc: user.kyc });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Rejeter le dossier KYC d'un utilisateur (motif obligatoire)
// @route   PATCH /api/kyc/:userId/rejeter
// @access  Privé (admin)
const rejeterKYC = async (req, res) => {
  try {
    const { motif } = req.body;
    if (!motif) {
      return res.status(400).json({ message: "Un motif de rejet est obligatoire" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    user.kyc.statutGlobal = "rejete";
    user.kyc.motifRejet = motif;
    user.kyc.valideParAdminId = req.user._id;
    user.kyc.valideLe = new Date();
    await user.save();

    console.log(`[AUDIT] KYC rejeté pour ${user.email} par admin ${req.user.email} — motif : ${motif}`);

    await notifier({
      destinataire: user._id,
      type: "kyc_rejete",
      titre: "Vérification d'identité refusée",
      message: `Ton dossier KYC a été rejeté. Motif : ${motif}. Tu peux déposer de nouveaux documents.`,
    });

    return res.status(200).json({ message: "Dossier KYC rejeté", kyc: user.kyc });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Liste des utilisateurs dont le dossier KYC est incomplet ou pas
//          encore soumis (pour permettre à l'admin de les relancer)
// @route   GET /api/kyc/incomplets
// @access  Privé (admin)
const getDossiersIncomplets = async (req, res) => {
  try {
    const users = await User.find({
      "kyc.statutGlobal": { $in: ["non_soumis", "incomplet"] },
      role: { $ne: "admin" }, // se relancer soi-même n'a pas de sens ; la demande visait les transporteurs
    }).select("nom email telephone role kyc");

    const resultat = users
      .map((u) => {
        const { complet, manquants } = verifierDossierComplet(u);
        return { user: u, manquants };
      })
      .filter((r) => !r.manquants || r.manquants.length > 0)
      .map((r) => ({
        _id: r.user._id,
        nom: r.user.nom,
        email: r.user.email,
        telephone: r.user.telephone,
        role: r.user.role,
        documentsManquants: r.manquants,
        derniereRelanceLe: r.user.kyc.derniereRelanceLe,
      }));

    return res.status(200).json(resultat);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Relancer manuellement un utilisateur pour compléter son dossier KYC
// @route   POST /api/kyc/:userId/relancer
// @access  Privé (admin)
const relancerKYC = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const { complet, manquants } = verifierDossierComplet(user);
    if (complet) {
      return res.status(400).json({ message: "Le dossier de cet utilisateur est déjà complet" });
    }

    user.kyc.derniereRelanceLe = new Date();
    await user.save();

    const LABELS = {
      cni_nina: "carte d'identité (CNI/NINA)",
      permis_conduire: "permis de conduire",
      carte_grise: "carte grise",
      rccm: "RCCM",
      nif: "NIF",
    };
    const listeManquants = manquants.map((m) => LABELS[m] || m).join(", ");

    await notifier({
      destinataire: user._id,
      type: "kyc_relance",
      titre: "Dossier d'identité incomplet",
      message: `Merci de compléter ton dossier KYC — il manque : ${listeManquants}. Un dossier incomplet limite l'accès à certaines fonctionnalités de la plateforme.`,
    });

    return res.status(200).json({ message: "Relance envoyée", manquants });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  donnerConsentement,
  ajouterDocument,
  getMonStatutKYC,
  getDossiersEnAttente,
  getDossiersIncomplets,
  validerKYC,
  rejeterKYC,
  relancerKYC,
};
