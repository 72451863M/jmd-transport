const mock = require("mock-require");

let messagesDB = {};
let counter = 1;

function makeMessageDoc(data) {
  const id = "msg_" + counter++;
  const doc = Object.assign({ _id: id, lu: false }, data, {
    save: async function () { messagesDB[id] = doc; return doc; },
  });
  messagesDB[id] = doc;
  return doc;
}

const FakeMessage = {
  create: async (data) => makeMessageDoc(data),
  find: (filter = {}) => {
    let list = Object.values(messagesDB);
    if (filter.livraison) list = list.filter((m) => String(m.livraison) === String(filter.livraison));
    const wrapper = Promise.resolve(list);
    wrapper.populate = () => wrapper;
    wrapper.sort = () => wrapper;
    return wrapper;
  },
  updateMany: async (filter, update) => {
    let list = Object.values(messagesDB);
    if (filter.livraison) list = list.filter((m) => String(m.livraison) === String(filter.livraison));
    if (filter.destinataire) list = list.filter((m) => String(m.destinataire) === String(filter.destinataire));
    if (filter.lu === false) list = list.filter((m) => m.lu === false);
    list.forEach((m) => { if (update.$set) Object.assign(m, update.$set); });
    return { modifiedCount: list.length };
  },
};

const livraisonsDB = {
  liv_attente: { _id: "liv_attente", client: "u_client", transporteur: null },
  liv1: { _id: "liv1", client: "u_client", transporteur: "u_transp" },
};
const FakeLivraison = { findById: async (id) => livraisonsDB[id] || null };
const FakeNotification = { create: async () => ({}) };

mock("../models/Message", FakeMessage);
mock("../models/Livraison", FakeLivraison);
mock("../models/Notification", FakeNotification);

const controllerPath = require.resolve("../controllers/messageController");
delete require.cache[controllerPath];
const { envoyerMessage, getMessagesLivraison } = require("../controllers/messageController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : message vide refusé
  let req = { params: { id: "liv1" }, body: { texte: "  " }, user: { _id: "u_client", role: "client" } };
  let res = fakeRes();
  await envoyerMessage(req, res);
  assert(res._status === 400, "Message vide refusé");

  // Test 2 : messagerie fermée tant que non assignée (liv_attente)
  req = { params: { id: "liv_attente" }, body: { texte: "Bonjour" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await envoyerMessage(req, res);
  assert(res._status === 400, "Messagerie fermée avant acceptation d'un transporteur");

  // Test 3 : le client envoie un message -> destinataire = transporteur, déduit automatiquement
  req = { params: { id: "liv1" }, body: { texte: "Bonjour, je suis en bas de l'immeuble" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await envoyerMessage(req, res);
  assert(res._status === 201, "Envoi de message par le client -> 201");
  assert(res._json.destinataire === "u_transp", "Destinataire déduit automatiquement (transporteur)");
  assert(res._json.texte === "Bonjour, je suis en bas de l'immeuble", "Texte du message conservé");

  // Test 4 : le transporteur répond -> destinataire = client
  req = { params: { id: "liv1" }, body: { texte: "J'arrive dans 5 minutes" }, user: { _id: "u_transp", role: "transporteur" } };
  res = fakeRes();
  await envoyerMessage(req, res);
  assert(res._json.destinataire === "u_client", "Destinataire déduit automatiquement (client)");

  // Test 5 : un tiers non concerné ne peut pas écrire
  req = { params: { id: "liv1" }, body: { texte: "coucou" }, user: { _id: "u_inconnu", role: "client" } };
  res = fakeRes();
  await envoyerMessage(req, res);
  assert(res._status === 403, "Un tiers non concerné ne peut pas écrire sur la conversation");

  // Test 6 : consultation de la conversation + marquage automatique comme lu
  req = { params: { id: "liv1" }, user: { _id: "u_transp", role: "transporteur" } };
  res = fakeRes();
  await getMessagesLivraison(req, res);
  assert(res._status === 200 && res._json.length === 2, "Les 2 messages de la conversation sont visibles");
  const messageVersTransp = Object.values(messagesDB).find((m) => m.destinataire === "u_transp");
  assert(messageVersTransp.lu === true, "Le message adressé au transporteur est marqué comme lu après consultation");

  // Test 7 : un tiers ne peut pas consulter la conversation
  req = { params: { id: "liv1" }, user: { _id: "u_inconnu", role: "client" } };
  res = fakeRes();
  await getMessagesLivraison(req, res);
  assert(res._status === 403, "Un tiers ne peut pas consulter la conversation");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
