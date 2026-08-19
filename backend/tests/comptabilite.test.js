const mock = require("mock-require");

const livraisonsDB = {
  liv1: { _id: "liv1", statut: "livree", prix: 2000, commission: 200, statutPaiement: "paye", save: async function () { livraisonsDB[this._id] = this; return this; } },
  liv2: { _id: "liv2", statut: "livree", prix: 3000, commission: 300, statutPaiement: "en_attente", save: async function () { livraisonsDB[this._id] = this; return this; } },
  liv3: { _id: "liv3", statut: "en_cours", prix: 1000, commission: 100, statutPaiement: "en_attente" }, // pas livrée, exclue du rapport
};

let remboursementsDB = {};
let counter = 1;
function makeRemboursementDoc(data) {
  const id = "remb_" + counter++;
  const doc = Object.assign({ _id: id }, data);
  remboursementsDB[id] = doc;
  return doc;
}

function buildQuery(getResult) {
  const wrapper = {};
  wrapper.populate = () => wrapper;
  wrapper.sort = () => wrapper;
  wrapper.then = (resolve, reject) => Promise.resolve(getResult()).then(resolve, reject);
  return wrapper;
}

const FakeLivraison = {
  findById: async (id) => livraisonsDB[id] || null,
  find: (filtre = {}) => {
    let list = Object.values(livraisonsDB);
    if (filtre.statut) list = list.filter((l) => l.statut === filtre.statut);
    return list;
  },
};
const FakeRemboursement = {
  create: async (data) => makeRemboursementDoc(data),
  find: () => buildQuery(() => Object.values(remboursementsDB)),
};

mock("../models/Livraison", FakeLivraison);
mock("../models/Remboursement", FakeRemboursement);
mock("../models/JournalAudit", { create: async () => ({}) });

const controllerPath = require.resolve("../controllers/comptabiliteController");
delete require.cache[controllerPath];
const { modifierStatutPaiement, creerRemboursement, getRemboursements, getRapportFinancier } = require("../controllers/comptabiliteController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : statut de paiement invalide refusé
  let req = { params: { id: "liv2" }, body: { statutPaiement: "virement_bancaire" }, user: { _id: "u_admin" } };
  let res = fakeRes();
  await modifierStatutPaiement(req, res);
  assert(res._status === 400, "Statut de paiement invalide -> 400");

  // Test 2 : confirmation manuelle valide
  req = { params: { id: "liv2" }, body: { statutPaiement: "paye" }, user: { _id: "u_admin" } };
  res = fakeRes();
  await modifierStatutPaiement(req, res);
  assert(res._status === 200, "Confirmation manuelle du paiement -> 200");
  assert(res._json.statutPaiement === "paye", "Le statut est bien mis à jour");

  // Test 3 : livraison introuvable
  req = { params: { id: "liv_inexistante" }, body: { statutPaiement: "paye" }, user: { _id: "u_admin" } };
  res = fakeRes();
  await modifierStatutPaiement(req, res);
  assert(res._status === 404, "Livraison introuvable -> 404");

  // Test 4 : remboursement sans motif refusé
  req = { body: { livraisonId: "liv1", montant: 500 }, user: { _id: "u_admin" } };
  res = fakeRes();
  await creerRemboursement(req, res);
  assert(res._status === 400, "Remboursement sans motif -> 400");

  // Test 5 : montant négatif refusé
  req = { body: { livraisonId: "liv1", montant: -100, motif: "Test" }, user: { _id: "u_admin" } };
  res = fakeRes();
  await creerRemboursement(req, res);
  assert(res._status === 400, "Montant négatif -> 400");

  // Test 6 : remboursement valide
  req = { body: { livraisonId: "liv1", montant: 500, motif: "Colis endommagé" }, user: { _id: "u_admin" } };
  res = fakeRes();
  await creerRemboursement(req, res);
  assert(res._status === 201, "Remboursement valide -> 201");
  assert(res._json.montant === 500, "Le montant est correctement enregistré");

  // Test 7 : liste des remboursements
  req = {};
  res = fakeRes();
  await getRemboursements(req, res);
  assert(res._json.length === 1, "La liste des remboursements contient bien l'entrée créée");

  // Test 8 : rapport financier — n'inclut que les livraisons livrées
  req = {};
  res = fakeRes();
  await getRapportFinancier(req, res);
  assert(res._json.nbFactures === 2, "Le rapport ne compte que les 2 livraisons livrées (pas celle en_cours)");
  assert(res._json.montantTotalFacture === 5000, "Montant total facturé = 2000 + 3000 = 5000 (exclut liv3)");
  assert(res._json.commissionTotale === 500, "Commission totale = 200 + 300 = 500");
  assert(res._json.montantNetTransporteurs === 4500, "Montant net transporteurs = 5000 - 500 = 4500");
  assert(res._json.repartitionParStatutPaiement.paye === 2, "Les 2 livraisons livrées sont bien 'payées' après les tests précédents");
  assert(res._json.montantTotalRembourse === 500, "Montant total remboursé = 500 (le remboursement du test 6)");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
