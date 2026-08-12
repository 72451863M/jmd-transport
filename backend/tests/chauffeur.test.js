const mock = require("mock-require");

let chauffeursDB = {};
let counter = 1;

function makeChauffeurDoc(data) {
  const id = "chf_" + counter++;
  const doc = Object.assign({ _id: id }, data, {
    save: async function () { chauffeursDB[id] = doc; return doc; },
    deleteOne: async function () { delete chauffeursDB[id]; },
  });
  chauffeursDB[id] = doc;
  return doc;
}

const FakeChauffeur = {
  create: async (data) => makeChauffeurDoc(data),
  findById: async (id) => chauffeursDB[id] || null,
  find: (filter = {}) => {
    let list = Object.values(chauffeursDB);
    if (filter.proprietaire) list = list.filter((c) => String(c.proprietaire) === String(filter.proprietaire));
    const wrapper = Promise.resolve(list);
    wrapper.sort = () => wrapper;
    return wrapper;
  },
};

mock("../models/Chauffeur", FakeChauffeur);
mock("../models/Vehicule", {});

const controllerPath = require.resolve("../controllers/chauffeurController");
delete require.cache[controllerPath];
const { ajouterChauffeur, getMesChauffeurs, modifierChauffeur, supprimerChauffeur } = require("../controllers/chauffeurController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : champs obligatoires manquants
  let req = { body: { nom: "Boubacar Traoré" }, user: { _id: "u_transp1" } };
  let res = fakeRes();
  await ajouterChauffeur(req, res);
  assert(res._status === 400, "Refus si le téléphone est manquant");

  // Test 2 : ajout valide
  req = { body: { nom: "  Boubacar Traoré  ", telephone: "+22376112233", numeroPermis: "ML-PC-98765" }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await ajouterChauffeur(req, res);
  assert(res._status === 201, "Ajout d'un chauffeur -> 201");
  assert(res._json.nom === "Boubacar Traoré", "Le nom est correctement nettoyé (espaces retirés)");
  const idChauffeur = res._json._id;

  // Test 3 : ajout d'un second chauffeur pour un autre transporteur
  req = { body: { nom: "Sekou Koné", telephone: "+22376998877" }, user: { _id: "u_transp2" } };
  res = fakeRes();
  await ajouterChauffeur(req, res);
  assert(res._status === 201, "Second chauffeur pour un autre transporteur -> 201");

  // Test 4 : liste isolée par transporteur
  req = { user: { _id: "u_transp1" } };
  res = fakeRes();
  await getMesChauffeurs(req, res);
  assert(res._json.length === 1, "u_transp1 ne voit que son propre chauffeur");

  // Test 5 : modification par le propriétaire
  req = { params: { id: idChauffeur }, body: { actif: false }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await modifierChauffeur(req, res);
  assert(res._status === 200 && res._json.actif === false, "Désactivation du chauffeur -> 200");

  // Test 6 : un tiers ne peut pas modifier
  req = { params: { id: idChauffeur }, body: { nom: "Intrus" }, user: { _id: "u_transp2" } };
  res = fakeRes();
  await modifierChauffeur(req, res);
  assert(res._status === 403, "Un tiers ne peut pas modifier le chauffeur d'un autre transporteur");

  // Test 7 : suppression par le propriétaire
  req = { params: { id: idChauffeur }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await supprimerChauffeur(req, res);
  assert(res._status === 200, "Suppression par le propriétaire -> 200");
  assert(chauffeursDB[idChauffeur] === undefined, "Le chauffeur a bien été retiré");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
