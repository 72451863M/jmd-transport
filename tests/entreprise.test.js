const mock = require("mock-require");

let entrepriseStore = {};
let usersDB = {};
let counter = 1;

function makeEntrepriseDoc(data) {
  const id = "ent_" + counter++;
  const doc = Object.assign({ _id: id }, data, {
    save: async function () { entrepriseStore[id] = doc; return doc; },
  });
  entrepriseStore[id] = doc;
  return doc;
}

const FakeEntreprise = {
  create: async (data) => makeEntrepriseDoc(data),
  findById: async (id) => entrepriseStore[id] || null,
};

function makeUserDoc(data) {
  const doc = Object.assign({ save: async function () { usersDB[doc._id] = doc; return doc; } }, data);
  usersDB[doc._id] = doc;
  return doc;
}

const FakeUser = {
  findById: async (id) => usersDB[id] || null,
  findOne: (filter) => {
    const result = Object.values(usersDB).find((u) => filter.email && u.email === filter.email) || null;
    const wrapper = Promise.resolve(result);
    wrapper.select = () => wrapper;
    return wrapper;
  },
  find: (filter = {}) => {
    let list = Object.values(usersDB);
    if (filter["entreprise.entrepriseId"]) list = list.filter((u) => String(u.entreprise?.entrepriseId) === String(filter["entreprise.entrepriseId"]));
    const wrapper = Promise.resolve(list);
    wrapper.select = () => wrapper;
    return wrapper;
  },
};

const FakeNotification = { create: async () => ({}) };

mock("../models/Entreprise", FakeEntreprise);
mock("../models/User", FakeUser);
mock("../models/Notification", FakeNotification);

const controllerPath = require.resolve("../controllers/entrepriseController");
delete require.cache[controllerPath];
const { creerEntreprise, getMonEntreprise, ajouterCollaborateur } = require("../controllers/entrepriseController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  makeUserDoc({ _id: "u_client1", nom: "Awa", email: "awa@test.com", role: "client", entreprise: { entrepriseId: null, roleEntreprise: null } });
  makeUserDoc({ _id: "u_client2", nom: "Boubou", email: "boubou@test.com", role: "client", entreprise: { entrepriseId: null, roleEntreprise: null } });
  makeUserDoc({ _id: "u_transp1", nom: "Seydou", email: "seydou@test.com", role: "transporteur", entreprise: { entrepriseId: null, roleEntreprise: null } });

  // Test 1 : raison sociale manquante refusée
  let req = { body: {}, user: usersDB["u_client1"] };
  let res = fakeRes();
  await creerEntreprise(req, res);
  assert(res._status === 400, "Refus si raison sociale manquante");

  // Test 2 : création par un client -> 201, user mis à jour en propriétaire
  req = { body: { raisonSociale: "Awa Import-Export", rccm: "MA-BKO-2024-B-123", nif: "1234567X" }, user: usersDB["u_client1"] };
  res = fakeRes();
  await creerEntreprise(req, res);
  assert(res._status === 201, "Création d'entreprise par un client -> 201");
  assert(usersDB["u_client1"].entreprise.roleEntreprise === "proprietaire", "Le créateur devient propriétaire");
  const idEntreprise = res._json._id;

  // Test 3 : un transporteur PEUT créer une entreprise (retour Module 3,
  // 08/08/2026 — auparavant réservé aux clients, ouvert aux transporteurs
  // pour qu'ils puissent « gérer leur entreprise » comme prévu au cahier des
  // charges). Voir tests/entrepriseTransporteur.test.js pour la couverture
  // détaillée de ce cas.
  req = { body: { raisonSociale: "Test Transport" }, user: usersDB["u_transp1"] };
  res = fakeRes();
  await creerEntreprise(req, res);
  assert(res._status === 201, "Un transporteur peut créer une entreprise");

  // Test 4 : un client déjà affilié ne peut pas en recréer une
  req = { body: { raisonSociale: "Autre" }, user: usersDB["u_client1"] };
  res = fakeRes();
  await creerEntreprise(req, res);
  assert(res._status === 400, "Un client déjà affilié ne peut pas créer une 2e entreprise");

  // Test 5 : le propriétaire ajoute un collaborateur
  req = { body: { email: "boubou@test.com" }, user: usersDB["u_client1"] };
  res = fakeRes();
  await ajouterCollaborateur(req, res);
  assert(res._status === 200, "Ajout de collaborateur -> 200");
  assert(usersDB["u_client2"].entreprise.roleEntreprise === "collaborateur", "Le collaborateur est bien affilié");

  // Test 6 : un collaborateur (non propriétaire) ne peut pas inviter quelqu'un
  const u_client3 = makeUserDoc({ _id: "u_client3", nom: "Fanta", email: "fanta@test.com", role: "client", entreprise: { entrepriseId: null, roleEntreprise: null } });
  req = { body: { email: "fanta@test.com" }, user: usersDB["u_client2"] };
  res = fakeRes();
  await ajouterCollaborateur(req, res);
  assert(res._status === 403, "Un collaborateur (non propriétaire) ne peut pas inviter");

  // Test 7 : consultation de l'entreprise avec ses collaborateurs
  req = { user: usersDB["u_client1"] };
  res = fakeRes();
  await getMonEntreprise(req, res);
  assert(res._status === 200, "Consultation de l'entreprise -> 200");
  assert(res._json.collaborateurs.length === 2, "2 membres trouvés (propriétaire + collaborateur)");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
