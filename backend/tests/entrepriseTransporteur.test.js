const mock = require("mock-require");

let entreprisesDB = {};
let usersDB = {};
let counter = 1;

function makeEntrepriseDoc(data) {
  const id = "ent_" + counter++;
  const doc = Object.assign({ _id: id }, data, { save: async function () { entreprisesDB[id] = doc; return doc; } });
  entreprisesDB[id] = doc;
  return doc;
}

const FakeEntreprise = { create: async (data) => makeEntrepriseDoc(data) };
const FakeUser = {
  findById: async (id) => usersDB[id] || null,
  findOne: (filter) => {
    const resultat = Object.values(usersDB).find((u) => u.email === filter.email) || null;
    const wrapper = Promise.resolve(resultat);
    wrapper.select = () => wrapper;
    return wrapper;
  },
};

mock("../models/Entreprise", FakeEntreprise);
mock("../models/User", FakeUser);

const controllerPath = require.resolve("../controllers/entrepriseController");
delete require.cache[controllerPath];
const { creerEntreprise, ajouterCollaborateur } = require("../controllers/entrepriseController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

function makeUserObj(data) {
  const doc = Object.assign({ save: async function () { usersDB[doc._id] = doc; return doc; } }, data);
  usersDB[doc._id] = doc;
  return doc;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : un transporteur peut créer une entreprise (retour Module 3)
  usersDB["u_transp1"] = makeUserObj({ _id: "u_transp1", role: "transporteur", entreprise: {} });
  let req = { body: { raisonSociale: "Diarra Transport SARL" }, user: usersDB["u_transp1"] };
  let res = fakeRes();
  await creerEntreprise(req, res);
  assert(res._status === 201, "Un transporteur peut créer une entreprise -> 201");
  const idEntreprise = res._json._id;

  // Test 2 : un client peut toujours créer une entreprise (non régression)
  usersDB["u_client1"] = makeUserObj({ _id: "u_client1", role: "client", entreprise: {} });
  req = { body: { raisonSociale: "Import Export SARL" }, user: usersDB["u_client1"] };
  res = fakeRes();
  await creerEntreprise(req, res);
  assert(res._status === 201, "Un client peut toujours créer une entreprise -> 201 (non régression)");

  // Test 3 : un admin ne peut pas créer d'entreprise (rôle non prévu pour ça)
  usersDB["u_admin1"] = makeUserObj({ _id: "u_admin1", role: "admin", entreprise: {} });
  req = { body: { raisonSociale: "Test SARL" }, user: usersDB["u_admin1"] };
  res = fakeRes();
  await creerEntreprise(req, res);
  assert(res._status === 403, "Un admin ne peut pas créer d'entreprise -> 403");

  // Test 4 : le propriétaire transporteur peut inviter un AUTRE transporteur
  usersDB["u_transp1"].entreprise = { entrepriseId: idEntreprise, roleEntreprise: "proprietaire" };
  usersDB["u_transp2"] = makeUserObj({ _id: "u_transp2", role: "transporteur", email: "collegue@test.com", entreprise: {} });
  req = { body: { email: "collegue@test.com" }, user: usersDB["u_transp1"] };
  res = fakeRes();
  await ajouterCollaborateur(req, res);
  assert(res._status === 200, "Un propriétaire transporteur peut inviter un autre transporteur -> 200");

  // Test 5 : un propriétaire transporteur NE PEUT PAS inviter un client (rôles mélangés)
  usersDB["u_client2"] = makeUserObj({ _id: "u_client2", role: "client", email: "client_intrus@test.com", entreprise: {} });
  req = { body: { email: "client_intrus@test.com" }, user: usersDB["u_transp1"] };
  res = fakeRes();
  await ajouterCollaborateur(req, res);
  assert(res._status === 400, "Un propriétaire transporteur ne peut pas inviter un client -> 400 (pas de mélange de rôles)");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
