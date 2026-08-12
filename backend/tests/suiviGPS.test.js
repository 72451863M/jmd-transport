const mock = require("mock-require");

const bamako = { lat: 12.6392, lng: -8.0029, label: "Bamako" };
const sikasso = { lat: 11.3167, lng: -5.6667, label: "Sikasso" };
const kayes = { lat: 14.4469, lng: -11.4443 }; // hors corridor Bamako-Sikasso

const livraisonsDB = {
  liv_avec_trajet: {
    _id: "liv_avec_trajet",
    client: "u_client",
    transporteur: "u_transp",
    adresseDepart: bamako,
    adresseArrivee: sikasso,
    retardDetecte: false,
    dateLivraisonPrevue: null,
    positionsTrajet: [
      { lat: 12.60, lng: -8.00, horodatage: new Date("2026-08-11T08:00:00Z") },
      { lat: 12.55, lng: -7.90, horodatage: new Date("2026-08-11T08:10:00Z") },
    ],
  },
  liv_sans_coords: {
    _id: "liv_sans_coords",
    client: "u_client",
    transporteur: "u_transp",
    adresseDepart: { label: "Départ sans coordonnées" },
    adresseArrivee: { label: "Arrivée sans coordonnées" },
    retardDetecte: true,
    dateLivraisonPrevue: new Date("2026-08-11T07:00:00Z"),
    positionsTrajet: [{ lat: 12.6, lng: -8.0, horodatage: new Date() }],
  },
  liv_en_deviation: {
    _id: "liv_en_deviation",
    client: "u_client",
    transporteur: "u_transp",
    adresseDepart: bamako,
    adresseArrivee: sikasso,
    retardDetecte: false,
    dateLivraisonPrevue: null,
    positionsTrajet: [{ lat: kayes.lat, lng: kayes.lng, horodatage: new Date() }],
  },
};

const FakeLivraison = { findById: async (id) => livraisonsDB[id] || null };
mock("../models/Livraison", FakeLivraison);

const controllerPath = require.resolve("../controllers/livraisonController");
delete require.cache[controllerPath];
const { getSuiviGPS } = require("../controllers/livraisonController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : accès refusé à un tiers non concerné
  let req = { params: { id: "liv_avec_trajet" }, user: { _id: "u_inconnu", role: "client" } };
  let res = fakeRes();
  await getSuiviGPS(req, res);
  assert(res._status === 403, "Un tiers non concerné n'a pas accès au suivi GPS");

  // Test 2 : le client peut consulter le suivi
  req = { params: { id: "liv_avec_trajet" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await getSuiviGPS(req, res);
  assert(res._status === 200, "Le client peut consulter le suivi -> 200");
  assert(res._json.positionActuelle.lat === 12.55, "La position actuelle est bien le dernier point du trajet");
  assert(res._json.itineraireParcouru.length === 2, "L'itinéraire parcouru contient tous les points historiques");

  // Test 3 : le transporteur assigné peut aussi consulter
  req = { params: { id: "liv_avec_trajet" }, user: { _id: "u_transp", role: "transporteur" } };
  res = fakeRes();
  await getSuiviGPS(req, res);
  assert(res._status === 200, "Le transporteur assigné peut consulter -> 200");

  // Test 4 : sans coordonnées départ/arrivée, aucune alerte de déviation n'est inventée
  req = { params: { id: "liv_sans_coords" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await getSuiviGPS(req, res);
  assert(res._json.alerteDeviation === null, "Aucune alerte de déviation si les coordonnées départ/arrivée manquent");
  assert(res._json.retard.detecte === true, "Le retard déjà détecté sur la livraison est correctement remonté");

  // Test 5 : une livraison en déviation déclenche bien l'alerte
  req = { params: { id: "liv_en_deviation" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await getSuiviGPS(req, res);
  assert(res._json.alerteDeviation !== null, "L'alerte de déviation est calculée quand les coordonnées existent");
  assert(res._json.alerteDeviation.enDeviation === true, "La déviation est correctement détectée pour une position hors corridor");

  // Test 6 : livraison introuvable
  req = { params: { id: "liv_inexistante" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await getSuiviGPS(req, res);
  assert(res._status === 404, "Livraison introuvable -> 404");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
