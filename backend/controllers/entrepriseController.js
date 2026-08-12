const Entreprise = require("../models/Entreprise");
const User = require("../models/User");
const { notifier } = require("../utils/notifications");

// @desc    Créer une entreprise cliente (l'utilisateur en devient propriétaire)
// @route   POST /api/entreprises
// @access  Privé (client, pas encore affilié à une entreprise)
const creerEntreprise = async (req, res) => {
  try {
    const { raisonSociale, rccm, nif, adresse, telephone } = req.body;

    if (!raisonSociale) {
      return res.status(400).json({ message: "La raison sociale est obligatoire" });
    }
    if (req.user.role !== "client" && req.user.role !== "transporteur") {
      return res.status(403).json({ message: "Seul un compte client ou transporteur peut créer une entreprise" });
    }
    if (req.user.entreprise?.entrepriseId) {
      return res.status(400).json({ message: "Vous êtes déjà affilié à une entreprise" });
    }

    const entreprise = await Entreprise.create({
      raisonSociale, rccm, nif, adresse, telephone,
      proprietaire: req.user._id,
    });

    const user = await User.findById(req.user._id);
    user.entreprise = { entrepriseId: entreprise._id, roleEntreprise: "proprietaire" };
    await user.save();

    return res.status(201).json(entreprise);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Détail de mon entreprise (avec la liste de ses collaborateurs)
// @route   GET /api/entreprises/moi
// @access  Privé (membre d'une entreprise)
const getMonEntreprise = async (req, res) => {
  try {
    if (!req.user.entreprise?.entrepriseId) {
      return res.status(404).json({ message: "Vous n'êtes affilié à aucune entreprise" });
    }
    const entreprise = await Entreprise.findById(req.user.entreprise.entrepriseId);
    if (!entreprise) {
      return res.status(404).json({ message: "Entreprise introuvable" });
    }
    const collaborateurs = await User.find({ "entreprise.entrepriseId": entreprise._id }).select("-password");

    return res.status(200).json({ entreprise, collaborateurs });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Inviter un utilisateur existant (par email) comme collaborateur
// @route   POST /api/entreprises/collaborateurs
// @access  Privé (propriétaire de l'entreprise)
const ajouterCollaborateur = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "L'email du collaborateur est obligatoire" });
    }
    if (req.user.entreprise?.roleEntreprise !== "proprietaire") {
      return res.status(403).json({ message: "Seul le propriétaire de l'entreprise peut ajouter un collaborateur" });
    }

    const collaborateur = await User.findOne({ email: email.trim().toLowerCase() }).select("-password");
    if (!collaborateur) {
      return res.status(404).json({ message: "Aucun compte trouvé avec cet email" });
    }
    if (collaborateur.role !== req.user.role) {
      return res.status(400).json({
        message: `Seul un compte du même type (${req.user.role}) que le propriétaire peut rejoindre cette entreprise`,
      });
    }
    if (collaborateur.entreprise?.entrepriseId) {
      return res.status(400).json({ message: "Cet utilisateur est déjà affilié à une entreprise" });
    }

    collaborateur.entreprise = {
      entrepriseId: req.user.entreprise.entrepriseId,
      roleEntreprise: "collaborateur",
    };
    await collaborateur.save();

    await notifier({
      destinataire: collaborateur._id,
      type: "entreprise_invitation",
      titre: "Ajouté à une entreprise",
      message: `Tu as été ajouté comme collaborateur à l'entreprise ${req.user.nom ? "de " + req.user.nom : ""}.`,
    });

    return res.status(200).json(collaborateur);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { creerEntreprise, getMonEntreprise, ajouterCollaborateur };
