const { distanceKm, detecterDeviationItineraire, detecterArrets } = require("../utils/gpsTracking");

let ok = 0, fail = 0;
function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

// --- distanceKm (Haversine) ---
// Bamako (12.6392, -8.0029) -> Sikasso (11.3167, -5.6667) : environ 280 km à vol d'oiseau
const dBamakoSikasso = distanceKm(12.6392, -8.0029, 11.3167, -5.6667);
assert(dBamakoSikasso > 260 && dBamakoSikasso < 300, `Distance Bamako-Sikasso plausible (${dBamakoSikasso.toFixed(1)} km)`);
assert(distanceKm(12.6392, -8.0029, 12.6392, -8.0029) === 0, "Distance d'un point à lui-même = 0");

// --- detecterDeviationItineraire ---
const bamako = { lat: 12.6392, lng: -8.0029 };
const sikasso = { lat: 11.3167, lng: -5.6667 };

// Test 1 : pas de coordonnées disponibles -> null (pas d'invention de données)
let res = detecterDeviationItineraire({ lat: 12, lng: -7 }, {}, {});
assert(res === null, "Retourne null si départ/arrivée n'ont pas de coordonnées (pas de fausse alerte)");

// Test 2 : position exactement sur le point de départ -> pas de déviation
res = detecterDeviationItineraire(bamako, bamako, sikasso);
assert(res !== null && res.enDeviation === false, "Aucune déviation si le transporteur est au point de départ");

// Test 3 : position exactement sur le point d'arrivée -> pas de déviation
res = detecterDeviationItineraire(sikasso, bamako, sikasso);
assert(res.enDeviation === false, "Aucune déviation si le transporteur est arrivé");

// Test 4 : position très éloignée de la ligne Bamako-Sikasso -> déviation détectée
// Kayes est à l'opposé (ouest du Mali), largement hors du corridor Bamako-Sikasso (sud-est)
const kayes = { lat: 14.4469, lng: -11.4443 };
res = detecterDeviationItineraire(kayes, bamako, sikasso);
assert(res.enDeviation === true, "Déviation détectée pour une position largement hors corridor");
assert(res.distanceKm > 5, "La distance de déviation rapportée est cohérente (> seuil)");

// Test 5 : point à mi-chemin sur la ligne -> pas de déviation
const milieu = { lat: (bamako.lat + sikasso.lat) / 2, lng: (bamako.lng + sikasso.lng) / 2 };
res = detecterDeviationItineraire(milieu, bamako, sikasso);
assert(res.enDeviation === false, "Aucune déviation pour un point exactement sur la ligne à mi-chemin");

// Test 6 : seuil personnalisé
res = detecterDeviationItineraire(kayes, bamako, sikasso, 1000);
assert(res.enDeviation === false, "Un seuil très large désactive l'alerte (personnalisable)");

// --- detecterArrets ---
const maintenant = new Date("2026-08-11T10:00:00Z");
function pos(lat, lng, minutesApres) {
  return { lat, lng, horodatage: new Date(maintenant.getTime() + minutesApres * 60000) };
}

// Test 7 : aucun arrêt sur un trajet qui bouge constamment
let trajet = [pos(12.60, -8.00, 0), pos(12.61, -8.01, 5), pos(12.62, -8.02, 10), pos(12.63, -8.03, 15)];
assert(detecterArrets(trajet).length === 0, "Aucun arrêt détecté sur un trajet en mouvement continu");

// Test 8 : un arrêt de 10 minutes au même endroit doit être détecté
trajet = [
  pos(12.60, -8.00, 0),
  pos(12.60, -8.00, 3), // même position
  pos(12.60, -8.00, 6), // même position -> 6 min d'arrêt (>= seuil 5 min)
  pos(12.65, -8.05, 20), // reprise du mouvement, loin
];
let arrets = detecterArrets(trajet);
assert(arrets.length === 1, "Un arrêt de 6 minutes est bien détecté");
assert(arrets[0].dureeMinutes === 6, "La durée de l'arrêt est correctement calculée (6 min)");

// Test 9 : un arrêt trop court (moins de 5 min) n'est pas comptabilisé
trajet = [pos(12.60, -8.00, 0), pos(12.60, -8.00, 2), pos(12.65, -8.05, 10)];
assert(detecterArrets(trajet).length === 0, "Un arrêt de seulement 2 minutes n'est pas comptabilisé (sous le seuil)");

// Test 10 : liste vide ou insuffisante -> pas d'erreur
assert(detecterArrets([]).length === 0, "Liste vide gérée sans erreur");
assert(detecterArrets([pos(12.6, -8.0, 0)]).length === 0, "Un seul point ne peut pas constituer un arrêt");

console.log(`\n${ok} tests réussis, ${fail} échoués`);
process.exit(fail > 0 ? 1 : 0);
