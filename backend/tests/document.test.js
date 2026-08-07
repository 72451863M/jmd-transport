const mock = require("mock-require");

let documentsDB = {};
let counter = 1;

function makeDocumentDoc(data) {
  const id = "doc_" + counter++;
  const doc = Object.assign({ _id: id }, data, {
    save: async function () { documentsDB[id] = doc; return doc; },
  });
  documentsDB[id] = doc;
  return doc;
}

const FakeDocument = {
  create: async (data) => makeDocumentDoc(data),
  find: (filter = {}) => {
    let list = Object.values(documentsDB);
    if (filter.livraison) list = list.filter((d) => String(d.livraison) === String(filter.livraison));
    const wrapper = Promise.resolve(list);
    wrapper.sort = () => wrapper;
    return wrapper;
  },
};

const livraisonsDB = {
  liv1: { _id: "liv1", client: "u_client", transporteur: "u_transp" },
};
const FakeLivraison = { findById: async (id) => livraisonsDB[id] || null };

mock("../models/Document", FakeDocument);
mock("../models/Livraison", FakeLivraison);

const controllerPath = require.resolve("../controllers/documentController");
delete require.cache[controllerPath];
const { getDocumentsLivraison, ajouterDocument } = require("../controllers/documentController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : type invalide refusé
  let req = { params: { id: "liv1" }, body: { type: "lettre_voiture", url: "http://x" }, user: { _id: "u_client", role: "client" } };
  let res = fakeRes();
  await ajouterDocument(req, res);
  assert(res._status === 400, "Refus d'ajouter manuellement une lettre_voiture (générée automatiquement uniquement)");

  // Test 2 : ajout valide par le client
  req = { params: { id: "liv1" }, body: { type: "photo", url: "http://x/photo.jpg" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await ajouterDocument(req, res);
  assert(res._status === 201, "Ajout d'une photo par le client -> 201");

  // Test 3 : ajout valide par le transporteur
  req = { params: { id: "liv1" }, body: { type: "bon_livraison", url: "http://x/bon.jpg" }, user: { _id: "u_transp", role: "transporteur" } };
  res = fakeRes();
  await ajouterDocument(req, res);
  assert(res._status === 201, "Ajout d'un bon de livraison par le transporteur -> 201");

  // Test 4 : un tiers non concerné ne peut pas ajouter de document
  req = { params: { id: "liv1" }, body: { type: "photo", url: "http://x" }, user: { _id: "u_inconnu", role: "client" } };
  res = fakeRes();
  await ajouterDocument(req, res);
  assert(res._status === 403, "Un tiers non concerné ne peut pas ajouter de document");

  // Test 5 : consultation de la liste par le client
  req = { params: { id: "liv1" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await getDocumentsLivraison(req, res);
  assert(res._status === 200 && res._json.length === 2, "Le client voit les 2 documents ajoutés");

  // Test 6 : un tiers ne peut pas consulter la liste
  req = { params: { id: "liv1" }, user: { _id: "u_inconnu", role: "client" } };
  res = fakeRes();
  await getDocumentsLivraison(req, res);
  assert(res._status === 403, "Un tiers ne peut pas consulter les documents");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
