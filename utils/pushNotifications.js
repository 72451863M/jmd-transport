// Envoi de notifications push mobiles via le service Expo Push
// (https://exp.host/--/api/v2/push/send). Cette API accepte les jetons émis
// aussi bien par une vraie appli iOS/Android installée que par un jeton de
// test — Expo se charge ensuite de relayer vers Apple/Google.
//
// Limite assumée et importante : ceci n'a jamais pu être testé en conditions
// réelles depuis l'environnement de développement (ni le service Expo Push,
// ni un vrai téléphone n'y sont accessibles) — la vérification finale se
// fait uniquement sur un vrai appareil. Le code suit fidèlement la
// documentation officielle et stable d'Expo, mais reste à valider en
// conditions réelles par l'utilisateur.
//
// Volontairement non bloquant, comme notifier() et enregistrerAudit() :
// un échec d'envoi push ne doit jamais faire échouer l'action métier
// d'origine.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function envoyerPushExpo(expoPushToken, titre, message, data = {}) {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) return null;

  try {
    const reponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        title: titre,
        body: message,
        data,
        sound: "default",
      }),
    });
    return await reponse.json();
  } catch (error) {
    console.error("[push] échec d'envoi :", error.message);
    return null;
  }
}

module.exports = { envoyerPushExpo };
