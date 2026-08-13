const mock = require("mock-require");

let reclamationsDB = {};
let livraisonsDB = {};
let counter = 1;

function makeReclamationDoc(data) {
  const id = "rec_" + counter++;
  const doc = Object.assign({ _id: id }, data, {
    save: async function () { reclamationsDB[id] = doc; return doc; },
  });
  reclamationsDB[id] = doc;
  return doc;
}

const FakeReclamation = {
  create: async (data) => makeReclamationDoc(data),
  findById: async (id) => reclamationsDB[id] || null,
  find: (filter = {}) => {
    let list = Object.values(reclamationsDB);
    if (filter.auteur) list = list.filter((r) => r.auteur === filter.auteur);
    if (filter.statut) list = list.filter((r) => r.statut === filter.statut);
    const wrapper = Promise.resolve(list);
    wrapper.populate = () => wrapper;
    wrapper.sort = () => wrapper;
    return wrapper;
  },
};

const FakeLivraison = {
  findById: async (id) => livraisonsDB[id] || null,
};

mock("../models/Reclamation", FakeReclamation);
const FakeNotification = { create: async () => ({}) };
mock("../models/Notification", FakeNotification);
mock("../models/Livraison", FakeLivraison);
const controllerPath = require.resolve("../controllers/reclamationController");
delete require.cache[controllerPath];
const { creerReclamation, getMesReclamations, getReclamations, repondreReclamation } = require("../controllers/reclamationController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  livraisonsDB["liv1"] = { _id: "liv1", client: "u_client", transporteur: "u_transp", statut: "livree" };
  livraisonsDB["liv2"] = { _id: "liv2", client: "u_client", transporteur: null, statut: "en_attente" };

  // Test 1 : champs manquants refusés
  let req = { body: { livraisonId: "liv1" }, user: { _id: "u_client", role: "client" } };
  let res = fakeRes();
  await creerReclamation(req, res);
  assert(res._status === 400, "Refus si motif/description manquants");

  // Test 2 : création valide par le client
  req = { body: { livraisonId: "liv1", motif: "marchandise_endommagee", description: "Colis cassé à l'arrivée" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await creerReclamation(req, res);
  assert(res._status === 201, "Création de réclamation par le client -> 201");
  assert(res._json.roleAuteur === "client", "roleAuteur correctement déduit (client)");
  const idReclamation = res._json._id;

  // Test 3 : un tiers non concerné ne peut pas réclamer
  req = { body: { livraisonId: "liv1", motif: "retard", description: "test" }, user: { _id: "u_inconnu", role: "client" } };
  res = fakeRes();
  await creerReclamation(req, res);
  assert(res._status === 403, "Un utilisateur non concerné par la livraison ne peut pas réclamer");

  // Test 4 : impossible sur une livraison en_attente
  req = { body: { livraisonId: "liv2", motif: "retard", description: "test" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await creerReclamation(req, res);
  assert(res._status === 400, "Réclamation refusée sur une livraison en_attente");

  // Test 5 : motif invalide refusé
  req = { body: { livraisonId: "liv1", motif: "motif_bidon", description: "test" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await creerReclamation(req, res);
  assert(res._status === 400, "Motif invalide refusé");

  // Test 6 : réponse admin
  req = { params: { id: idReclamation }, body: { texte: "Remboursement en cours", statut: "resolue" }, user: { _id: "u_admin", role: "admin" } };
  res = fakeRes();
  await repondreReclamation(req, res);
  assert(res._status === 200, "Réponse admin -> 200");
  assert(reclamationsDB[idReclamation].statut === "resolue", "Statut mis à jour après réponse");
  assert(reclamationsDB[idReclamation].reponse.texte === "Remboursement en cours", "Texte de réponse enregistré");

  // Test 7 : réponse sans statut valide refusée
  req = { params: { id: idReclamation }, body: { texte: "test", statut: "n_importe_quoi" }, user: { _id: "u_admin", role: "admin" } };
  res = fakeRes();
  await repondreReclamation(req, res);
  assert(res._status === 400, "Statut de réponse invalide refusé");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
