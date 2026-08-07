const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// @desc    Inscription d'un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { nom, email, telephone, password, role, vehicule } = req.body;

    if (!nom || !email || !telephone || !password) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs obligatoires" });
    }

    // L'email est normalisé en minuscules par le schéma (lowercase: true) ;
    // la recherche doit utiliser la même normalisation, sinon un compte
    // existant avec une casse différente ne serait pas détecté (bug corrigé le 06/08/2026).
    const emailNormalise = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: emailNormalise });
    if (userExists) {
      return res.status(400).json({ message: "Un compte existe déjà avec cet email" });
    }

    // Sécurité : seuls "client" et "transporteur" sont des rôles auto-attribuables.
    // "admin" ne peut jamais être choisi via l'inscription publique — il doit être
    // attribué manuellement en base de données par un administrateur existant.
    const rolesAutorisesInscription = ["client", "transporteur"];
    const roleFinal = rolesAutorisesInscription.includes(role) ? role : "client";

    const user = await User.create({
      nom,
      email,
      telephone,
      password,
      role: roleFinal,
      vehicule: roleFinal === "transporteur" ? vehicule : undefined,
    });

    return res.status(201).json({
      _id: user._id,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur lors de l'inscription", error: error.message });
  }
};

// @desc    Connexion utilisateur
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    if (!user.actif) {
      return res.status(403).json({ message: "Ce compte a été désactivé" });
    }

    return res.status(200).json({
      _id: user._id,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur lors de la connexion", error: error.message });
  }
};

// @desc    Récupérer le profil de l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Privé
const getMe = async (req, res) => {
  return res.status(200).json(req.user);
};

module.exports = { register, login, getMe };
