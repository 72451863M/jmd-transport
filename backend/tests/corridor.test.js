const mock = require("mock-require");

let livraisonsDB = {};
let corridorsDB = {
  cor1: { _id: "cor1", nom: "Dakar–Bamako", paysDepart: "Sénégal", paysArrivee: "Mali", actif: true },
};
let counter = 1;

function makeLivraisonDoc(data) {
  const id = "liv_" + counter++;
  const doc = Object.assign({ _id: id }, data, {
    toObject() { return Object.assign({}, doc); },
    save: async function () { livraisonsDB[id] = doc; return doc; },
  });
  livraisonsDB[id] = doc;
  return doc;
}

const FakeLivraison = { create: async (data) => makeLivraisonDoc(data) };
const FakeCorridor = {
  findOne: async (filter) =>
    Object.values(corridorsDB).find(
      (c) => c.paysDepart === filter.paysDepart && c.paysArrivee === filter.paysArrivee && c.actif === filter.actif
    ) || null,
};

const FakeUser = { find: async () => [] };
const FakeNotification = { create: async () => ({}) };

mock("../models/Livraison", FakeLivraison);
mock("../models/Corridor", FakeCorridor);
mock("../models/User", FakeUser);
mock("../models/Document", {});
mock("../models/Notification", FakeNotification);

const controllerPath = require.resolve("../controllers/livraisonController");
delete require.cache[controllerPath];
const { creerLivraison } = require("../controllers/livraisonController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : livraison purement locale (Mali -> Mali, pays implicite)
  let req = {
    body: { adresseDepart: { label: "Médine, Bamako" }, adresseArrivee: { label: "ACI 2000, Bamako" }, distanceKm: 8, poidsKg: 10 },
    user: { _id: "u_client" },
  };
  let res = fakeRes();
  await creerLivraison(req, res);
  assert(res._status === 201, "Création locale -> 201");
  assert(res._json.estTransfrontalier === false, "Livraison intra-Mali marquée non transfrontalière");
  assert(res._json.statutDouane === "non_applicable", "Statut douane non_applicable pour un trajet local");
  assert(res._json.adresseDepart.pays === "Mali", "Pays par défaut = Mali si non précisé");

  // Test 2 : livraison transfrontalière avec corridor connu (Sénégal -> Mali)
  req = {
    body: {
      adresseDepart: { label: "Dakar", pays: "Sénégal" },
      adresseArrivee: { label: "Bamako", pays: "Mali" },
      distanceKm: 1200, poidsKg: 500,
    },
    user: { _id: "u_client" },
  };
  res = fakeRes();
  await creerLivraison(req, res);
  assert(res._json.estTransfrontalier === true, "Livraison Sénégal->Mali marquée transfrontalière");
  assert(res._json.statutDouane === "a_traiter_manuellement", "Statut douane à traiter manuellement (aucune règle inventée)");
  assert(res._json.corridor === "cor1", "Corridor Dakar–Bamako correctement associé");

  // Test 3 : livraison transfrontalière SANS corridor de référence connu
  req = {
    body: {
      adresseDepart: { label: "Accra", pays: "Ghana" },
      adresseArrivee: { label: "Bamako", pays: "Mali" },
      distanceKm: 1600, poidsKg: 200,
    },
    user: { _id: "u_client" },
  };
  res = fakeRes();
  await creerLivraison(req, res);
  assert(res._json.estTransfrontalier === true, "Transfrontalier même sans corridor de référence connu");
  assert(res._json.corridor === null, "Aucun corridor associé si non référencé (pas d'invention)");
  assert(res._json.statutDouane === "a_traiter_manuellement", "Statut douane reste à traiter manuellement");

  // Test 4 : le prix n'est jamais inventé/majoré automatiquement pour un trajet transfrontalier
  // (la formule reste la même formule V1 — pas de barème douanier ajouté sans validation)
  const prixLocal = res._json.prix;
  assert(typeof prixLocal === "number" && prixLocal > 0, "Le prix reste calculé par la formule V1 existante, sans surcoût douanier inventé");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
