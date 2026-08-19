const Notification = require("../models/Notification");
const User = require("../models/User");
const { envoyerPushExpo } = require("./pushNotifications");

/**
 * Crée une notification in-app pour un utilisateur. Conçue pour être
 * appelée depuis les autres contrôleurs (livraison, KYC, réclamation...)
 * plutôt que d'être exposée comme endpoint public de création.
 *
 * Volontairement non bloquante pour l'appelant : si la création échoue,
 * l'erreur est journalisée mais ne fait pas échouer l'action métier
 * d'origine (ex. l'acceptation d'une mission ne doit pas planter parce
 * qu'une notification n'a pas pu être écrite).
 *
 * Envoie aussi une vraie notification push sur le téléphone, si l'appli
 * mobile a enregistré un jeton pour ce destinataire — même principe non
 * bloquant, un échec d'envoi push ne fait jamais échouer l'action.
 */
async function notifier({ destinataire, type, titre, message, lien }) {
  if (!destinataire) return null;
  let notification;
  try {
    notification = await Notification.create({ destinataire, type, titre, message, lien: lien || null });
  } catch (error) {
    console.error("[notifications] échec de création :", error.message);
    return null;
  }

  // La tentative d'envoi push est isolée dans son propre bloc : un souci ici
  // (jeton absent, réseau, utilisateur introuvable...) ne doit jamais faire
  // perdre le résultat de la notification déjà créée avec succès.
  try {
    const utilisateur = await User.findById(destinataire);
    if (utilisateur?.expoPushToken) {
      await envoyerPushExpo(utilisateur.expoPushToken, titre, message, { type, lien: lien || null });
    }
  } catch (error) {
    console.error("[notifications] échec de l'envoi push (notification in-app tout de même créée) :", error.message);
  }

  return notification;
}

module.exports = { notifier };
