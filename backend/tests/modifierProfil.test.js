const mock = require("mock-require");

let userStore = {};

function makeUser(data) {
  const doc = Object.assign(
    { comparePassword: async function (candidat) { return candidat === this._motDePasseClair; } },
    data,
    { save: async function () { userStore[this._id] = this; return this; } }
  );
  userStore[doc._id] = doc;
  return doc;
}

const FakeUser = {
  findById: async (id) => userStore[id] || null,
};

mock("../models/User", FakeUser);

const controllerPath = require.resolve("../controllers/authController");
delete require.cache[controllerPath];
const { modifierMonProfil } = require("../controllers/authController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  userStore["u1"] = makeUser({ _id: "u1", nom: "Ancien Nom", email: "test@test.com", telephone: "+22376000000", role: "client", _motDePasseClair: "ancien123" });

  // Test 1 : modifier sans fournir le mot de passe actuel -> refusé
  let req = { user: { _id: "u1" }, body: { nom: "Nouveau Nom" } };
  let res = fakeRes();
  await modifierMonProfil(req, res);
  assert(res._status === 400, "Modification sans mot de passe actuel -> 400");

  // Test 2 : mot de passe actuel incorrect -> refusé
  req = { user: { _id: "u1" }, body: { nom: "Nouveau Nom", motDePasseActuel: "mauvais" } };
  res = fakeRes();
  await modifierMonProfil(req, res);
  assert(res._status === 401, "Mot de passe actuel incorrect -> 401");

  // Test 3 : modification valide du nom et du téléphone
  req = { user: { _id: "u1" }, body: { nom: "Nouveau Nom", telephone: "+22376111111", motDePasseActuel: "ancien123" } };
  res = fakeRes();
  await modifierMonProfil(req, res);
  assert(res._status === 200, "Modification valide -> 200");
  assert(userStore["u1"].nom === "Nouveau Nom", "Le nom est bien mis à jour");
  assert(userStore["u1"].telephone === "+22376111111", "Le téléphone est bien mis à jour");

  // Test 4 : changement de mot de passe trop court -> refusé
  req = { user: { _id: "u1" }, body: { motDePasseActuel: "ancien123", nouveauMotDePasse: "abc" } };
  res = fakeRes();
  await modifierMonProfil(req, res);
  assert(res._status === 400, "Nouveau mot de passe trop court -> 400");

  // Test 5 : changement de mot de passe valide
  req = { user: { _id: "u1" }, body: { motDePasseActuel: "ancien123", nouveauMotDePasse: "nouveauMotDePasse456" } };
  res = fakeRes();
  await modifierMonProfil(req, res);
  assert(res._status === 200, "Changement de mot de passe valide -> 200");
  assert(userStore["u1"].password === "nouveauMotDePasse456", "Le mot de passe est bien mis à jour (rehaché par le hook pre-save en conditions réelles)");

  // Test 6 : la réponse ne renvoie jamais le mot de passe
  assert(res._json.password === undefined, "La réponse ne contient jamais le mot de passe");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
