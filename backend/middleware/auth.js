const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Vérifie que la requête contient un token JWT valide
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }

      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Non autorisé, token invalide" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Non autorisé, aucun token fourni" });
  }
};

module.exports = { protect };
