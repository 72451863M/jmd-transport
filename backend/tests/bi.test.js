const mock = require("mock-require");

const livraisonsDB = {
  liv1: {
    _id: "liv1", statut: "livree", prix: 2000, commission: 200, estTransfrontalier: false,
    adresseDepart: { label: "Médine, Bamako" }, adresseArrivee: { label: "ACI 2000, Bamako" },
  },
  liv2: {
    _id: "liv2", statut: "livree", prix: 3000, commission: 300, estTransfrontalier: true,
    adresseDepart: { label: "Médine, Bamako" }, adresseArrivee: { label: "Abidjan" },
  },
  liv3: {
    _id: "liv3", statut: "en_cours", prix: 1500, commission: 150, estTransfrontalier: false,
    adresseDepart: { label: "Sotuba, Bamako" }, adresseArrivee: { label: "ACI 2000, Bamako" },
  },
  liv4: {
    _id: "liv4", statut: "annulee", prix: 1000, commission: 100, estTransfrontalier: false,
    adresseDepart: { label: "Médine, Bamako" }, adresseArrivee: { label: "Faladié, Bamako" },
  },
};

const usersDB = {
  u1: {
    _id: "u1", role: "transporteur", nom: "Transporteur A", scoreIA: 82,
    statsFiabilite: { missionsCompletees: 12 },
    calculerScoreFiabilite() { return 88; },
  },
  u2: {
    _id: "u2", role: "transporteur", nom: "Transporteur B", scoreIA: null,
    statsFiabilite: { missionsCompletees: 3 },
    calculerScoreFiabilite() { return null; },
  },
  u3: { _id: "u3", role: "client", nom: "Un client" },
};

const FakeLivraison = { find: async () => Object.values(livraisonsDB) };
const FakeUser = { find: async (filter) => Object.values(usersDB).filter((u) => !filter.role || u.role === filter.role) };

mock("../models/Livraison", FakeLivraison);
mock("../models/User", FakeUser);

const controllerPath = require.resolve("../controllers/biController");
delete require.cache[controllerPath];
const { getStatistiques, getZonesPopulaires, getClassementTransporteurs } = require("../controllers/biController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : statistiques globales
  let res = fakeRes();
  await getStatistiques({}, res);
  assert(res._status === 200, "getStatistiques -> 200");
  assert(res._json.nbLivraisonsTotal === 4, "4 livraisons comptabilisées au total");
  assert(res._json.revenuTotal === 5000, "Revenu total = somme des prix des livraisons LIVREES uniquement (2000+3000)");
  assert(res._json.commissionTotale === 500, "Commission totale correcte (200+300), hors en_cours/annulee");
  assert(res._json.parStatut.livree === 2 && res._json.parStatut.en_cours === 1 && res._json.parStatut.annulee === 1, "Répartition par statut correcte");
  assert(res._json.nbTransfrontalier === 1, "1 livraison transfrontalière comptabilisée");

  // Test 2 : zones populaires
  res = fakeRes();
  await getZonesPopulaires({}, res);
  assert(res._status === 200, "getZonesPopulaires -> 200");
  assert(res._json.departsPopulaires[0].label === "Médine, Bamako" && res._json.departsPopulaires[0].count === 3, "Départ le plus fréquent correctement identifié (Médine, 3 fois)");

  // Test 3 : classement transporteurs
  res = fakeRes();
  await getClassementTransporteurs({}, res);
  assert(res._status === 200, "getClassementTransporteurs -> 200");
  assert(res._json.length === 2, "Seuls les transporteurs apparaissent (pas le client)");
  assert(res._json[0].nom === "Transporteur A", "Classement trié par missions complétées décroissant");
  assert(res._json[0].scoreFiabilite === 88, "Score de fiabilité correctement récupéré");
  assert(res._json[1].scoreFiabilite === null, "Score null géré proprement pour un transporteur sans historique");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
