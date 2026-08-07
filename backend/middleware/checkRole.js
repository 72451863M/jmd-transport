// Middleware factory : autorise uniquement les rôles listés
// Utilisation : checkRole("admin", "transporteur")
const checkRole = (...rolesAutorises) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({
        message: `Accès refusé : rôle '${req.user.role}' non autorisé pour cette action`,
      });
    }

    next();
  };
};

module.exports = checkRole;
