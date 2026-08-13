// Module 10 — Suivi GPS
//
// Limite technique importante à connaître : ce projet n'a pas accès à un
// service de routage réel (Google Directions, Mapbox Directions, etc. —
// nécessitent des clés API payantes). La détection de sortie d'itinéraire
// compare donc la position actuelle à une ligne DROITE entre le départ et
// l'arrivée, pas au vrai tracé routier. C'est une approximation raisonnable
// et fonctionnelle, mais un transporteur qui suit une route qui serpente
// s'écartera légitimement de cette ligne sans qu'il y ait de vraie anomalie
// — le seuil de tolérance (5 km par défaut) est fixé large pour limiter les
// fausses alertes, à ajuster si besoin une fois en usage réel.

const RAYON_TERRE_KM = 6371;
const SEUIL_DEVIATION_KM = 5;
const SEUIL_ARRET_MINUTES = 5;
const SEUIL_ARRET_METRES = 150;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

// Distance à vol d'oiseau entre deux points GPS (formule de Haversine)
function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RAYON_TERRE_KM * c;
}

// Distance entre un point et le segment [depart, arrivee] (projection sur la
// droite, approximation plane valable pour des distances régionales comme
// le Mali/UEMOA — pas adaptée à des trajets intercontinentaux).
function distancePointSegmentKm(point, depart, arrivee) {
  const toXY = (p) => ({
    x: p.lng * Math.cos(toRadians((depart.lat + arrivee.lat) / 2)),
    y: p.lat,
  });
  const P = toXY(point);
  const A = toXY(depart);
  const B = toXY(arrivee);

  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const longueurCarree = dx * dx + dy * dy;

  let t = longueurCarree === 0 ? 0 : ((P.x - A.x) * dx + (P.y - A.y) * dy) / longueurCarree;
  t = Math.max(0, Math.min(1, t));

  const projete = { lat: A.y + t * dy, lng: (A.x + t * dx) / Math.cos(toRadians((depart.lat + arrivee.lat) / 2)) };
  return distanceKm(point.lat, point.lng, projete.lat, projete.lng);
}

/**
 * Détecte si la position actuelle s'écarte trop de la ligne départ→arrivée.
 * Retourne null si départ ou arrivée n'ont pas de coordonnées connues (le
 * client n'a pas fourni de position — cas courant, la géolocalisation du
 * formulaire de demande est facultative).
 */
function detecterDeviationItineraire(positionActuelle, adresseDepart, adresseArrivee, seuilKm = SEUIL_DEVIATION_KM) {
  if (!positionActuelle) return null;
  if (!adresseDepart?.lat || !adresseDepart?.lng || !adresseArrivee?.lat || !adresseArrivee?.lng) return null;

  const distance = distancePointSegmentKm(
    positionActuelle,
    { lat: adresseDepart.lat, lng: adresseDepart.lng },
    { lat: adresseArrivee.lat, lng: adresseArrivee.lng }
  );

  return {
    enDeviation: distance > seuilKm,
    distanceKm: Math.round(distance * 10) / 10,
    seuilKm,
  };
}

/**
 * Détecte les arrêts à partir de l'historique de positions : un arrêt est un
 * groupe de points consécutifs restés dans un rayon de SEUIL_ARRET_METRES
 * pendant au moins SEUIL_ARRET_MINUTES.
 */
function detecterArrets(positionsTrajet) {
  if (!positionsTrajet || positionsTrajet.length < 2) return [];

  const points = [...positionsTrajet].sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage));
  const arrets = [];
  let groupeDebut = 0;

  for (let i = 1; i <= points.length; i++) {
    const finDeGroupe =
      i === points.length ||
      distanceKm(points[groupeDebut].lat, points[groupeDebut].lng, points[i].lat, points[i].lng) * 1000 > SEUIL_ARRET_METRES;

    if (finDeGroupe) {
      const groupe = points.slice(groupeDebut, i);
      if (groupe.length >= 2) {
        const debut = new Date(groupe[0].horodatage);
        const fin = new Date(groupe[groupe.length - 1].horodatage);
        const dureeMinutes = (fin - debut) / 60000;
        if (dureeMinutes >= SEUIL_ARRET_MINUTES) {
          arrets.push({
            lat: groupe[0].lat,
            lng: groupe[0].lng,
            debut,
            fin,
            dureeMinutes: Math.round(dureeMinutes),
          });
        }
      }
      groupeDebut = i;
    }
  }

  return arrets;
}

module.exports = {
  distanceKm,
  detecterDeviationItineraire,
  detecterArrets,
  SEUIL_DEVIATION_KM,
  SEUIL_ARRET_MINUTES,
  SEUIL_ARRET_METRES,
};
