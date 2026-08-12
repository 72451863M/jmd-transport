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
let parametresDB = { global: { _id: "global", tauxCommission: 0.2, paysActifs: ["Mali"], devise: "FCFA" } };
const FakeParametre = {
  findById: async (id) => parametresDB[id] || null,
  create: async (data) => { parametresDB[data._id] = data; return data; },
};

mock("../models/Livraison", FakeLivraison);
mock("../models/Corridor", FakeCorridor);
mock("../models/User", FakeUser);
mock("../models/Document", {});
mock("../models/Notification", FakeNotification);
mock("../models/Parametre", FakeParametre);

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

  // Test 1 : la commission utilise bien le taux configuré (20%), pas le défaut (10%)
  let req = { body: { adresseDepart: { label: "A" }, adresseArrivee: { label: "B" }, distanceKm: 10, poidsKg: 10 }, user: { _id: "u1" } };
  let res = fakeRes();
  await creerLivraison(req, res);
  assert(res._status === 201, "Création avec taux configuré -> 201");
  const commissionAttendue = Math.round(res._json.prix * 0.2);
  assert(res._json.commission === commissionAttendue, `Commission calculée avec le taux configuré (20%), pas le défaut (10%) — attendu ${commissionAttendue}, obtenu ${res._json.commission}`);

  // Test 2 : si aucun paramètre n'existe (installation neuve), repli sur le taux par défaut (10%)
  parametresDB = {}; // simule une base neuve
  req = { body: { adresseDepart: { label: "A" }, adresseArrivee: { label: "B" }, distanceKm: 10, poidsKg: 10 }, user: { _id: "u1" } };
  res = fakeRes();
  await creerLivraison(req, res);
  const commissionParDefaut = Math.round(res._json.prix * 0.1);
  assert(res._json.commission === commissionParDefaut, "Sans paramètre existant, repli sur le taux par défaut (10%) — pas de crash");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
