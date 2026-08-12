const mock = require("mock-require");

let livraisonsDB = {};
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
const FakeCorridor = { findOne: async () => null };
const FakeUser = { find: async () => [] };
const FakeNotification = { create: async () => ({}) };

mock("../models/Livraison", FakeLivraison);
mock("../models/Corridor", FakeCorridor);
mock("../models/User", FakeUser);
mock("../models/Document", {});
mock("../models/Notification", FakeNotification);
mock("../models/Parametre", { findById: async () => null, create: async (data) => data });

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

  const base = { adresseDepart: { label: "A" }, adresseArrivee: { label: "B" }, distanceKm: 5, poidsKg: 10 };

  // Test 1 : par défaut, type "colis" si non précisé (non-régression)
  let req = { body: { ...base }, user: { _id: "u1" } };
  let res = fakeRes();
  await creerLivraison(req, res);
  assert(res._status === 201, "Création sans type précisé -> 201");
  assert(res._json.typeMarchandise === "colis", "Type par défaut = colis");

  // Test 2 : type invalide refusé
  req = { body: { ...base, typeMarchandise: "or_massif" }, user: { _id: "u1" } };
  res = fakeRes();
  await creerLivraison(req, res);
  assert(res._status === 400, "Type de marchandise invalide -> 400");

  // Test 3 : produits pétroliers sans déclaration -> refusé
  req = { body: { ...base, typeMarchandise: "produits_petroliers" }, user: { _id: "u1" } };
  res = fakeRes();
  await creerLivraison(req, res);
  assert(res._status === 400, "Produits pétroliers sans déclaration -> 400");
  assert(res._json.message.includes("déclaration"), "Le message explique qu'une déclaration est requise");

  // Test 4 : produits pétroliers AVEC déclaration -> accepté
  req = { body: { ...base, typeMarchandise: "produits_petroliers", declarationMarchandiseDangereuse: true }, user: { _id: "u1" } };
  res = fakeRes();
  await creerLivraison(req, res);
  assert(res._status === 201, "Produits pétroliers avec déclaration -> 201");
  assert(res._json.declarationMarchandiseDangereuse === true, "La déclaration est bien enregistrée");

  // Test 5 : produits dangereux sans déclaration -> refusé aussi
  req = { body: { ...base, typeMarchandise: "produits_dangereux" }, user: { _id: "u1" } };
  res = fakeRes();
  await creerLivraison(req, res);
  assert(res._status === 400, "Produits dangereux sans déclaration -> 400");

  // Test 6 : produits agricoles sans déclaration -> accepté (pas dans la liste sensible)
  req = { body: { ...base, typeMarchandise: "produits_agricoles" }, user: { _id: "u1" } };
  res = fakeRes();
  await creerLivraison(req, res);
  assert(res._status === 201, "Produits agricoles sans déclaration -> 201 (pas une matière sensible)");

  // Test 7 : palettes -> nombrePalettes correctement enregistré
  req = { body: { ...base, typeMarchandise: "palettes", nombrePalettes: 12 }, user: { _id: "u1" } };
  res = fakeRes();
  await creerLivraison(req, res);
  assert(res._status === 201, "Palettes -> 201");
  assert(res._json.nombrePalettes === 12, "Le nombre de palettes est correctement enregistré");

  // Test 8 : nombrePalettes ignoré si le type n'est pas "palettes"
  req = { body: { ...base, typeMarchandise: "colis", nombrePalettes: 99 }, user: { _id: "u1" } };
  res = fakeRes();
  await creerLivraison(req, res);
  assert(res._json.nombrePalettes === null, "nombrePalettes ignoré si le type n'est pas palettes (pas de donnée incohérente)");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
