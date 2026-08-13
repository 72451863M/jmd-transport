const Notification = require("../models/Notification");

/**
 * Crée une notification in-app pour un utilisateur. Conçue pour être
 * appelée depuis les autres contrôleurs (livraison, KYC, réclamation...)
 * plutôt que d'être exposée comme endpoint public de création.
 *
 * Volontairement non bloquante pour l'appelant : si la création échoue,
 * l'erreur est journalisée mais ne fait pas échouer l'action métier
 * d'origine (ex. l'acceptation d'une mission ne doit pas planter parce
 * qu'une notification n'a pas pu être écrite).
 */
async function notifier({ destinataire, type, titre, message, lien }) {
  if (!destinataire) return null;
  try {
    return await Notification.create({ destinataire, type, titre, message, lien: lien || null });
  } catch (error) {
    console.error("[notifications] échec de création :", error.message);
    return null;
  }
}

module.exports = { notifier };
