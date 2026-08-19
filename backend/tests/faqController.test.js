const mock = require("mock-require");

let faqDB = {};
let counter = 1;

function makeFAQDoc(data) {
  const id = "faq_" + counter++;
  const doc = Object.assign({ _id: id, actif: true, categorie: "Général", ordre: 0 }, data, {
    save: async function () { faqDB[id] = doc; return doc; },
    deleteOne: async function () { delete faqDB[id]; },
  });
  faqDB[id] = doc;
  return doc;
}

function buildListQuery(list) {
  const wrapper = {};
  wrapper.sort = () => wrapper;
  wrapper.then = (resolve, reject) => Promise.resolve(list).then(resolve, reject);
  return wrapper;
}

const FakeFAQ = {
  create: async (data) => makeFAQDoc(data),
  findById: async (id) => faqDB[id] || null,
  find: (filtre = {}) => {
    let list = Object.values(faqDB);
    if (filtre.actif !== undefined) list = list.filter((f) => f.actif === filtre.actif);
    return buildListQuery(list);
  },
};

mock("../models/FAQ", FakeFAQ);
mock("../models/JournalAudit", { create: async () => ({}) });

const controllerPath = require.resolve("../controllers/faqController");
delete require.cache[controllerPath];
const { getFAQ, rechercherAssistant, getToutesFAQ, ajouterFAQ, modifierFAQ, supprimerFAQ } = require("../controllers/faqController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : refus si question ou réponse manquante
  let req = { body: { question: "Comment faire ?" }, user: { _id: "u_admin" } };
  let res = fakeRes();
  await ajouterFAQ(req, res);
  assert(res._status === 400, "Refus si la réponse est manquante");

  // Test 2 : ajout valide
  req = { body: { question: "Comment valider mon KYC ?", reponse: "Va dans Mon KYC.", categorie: "KYC" }, user: { _id: "u_admin" } };
  res = fakeRes();
  await ajouterFAQ(req, res);
  assert(res._status === 201, "Ajout d'une entrée FAQ -> 201");
  const idFAQ = res._json._id;

  // Test 3 : une seconde entrée, désactivée dès la création via modification
  req = { body: { question: "Vieille question obsolète", reponse: "Ancienne réponse" }, user: { _id: "u_admin" } };
  res = fakeRes();
  await ajouterFAQ(req, res);
  const idFAQObsolete = res._json._id;
  req = { params: { id: idFAQObsolete }, body: { actif: false }, user: { _id: "u_admin" } };
  res = fakeRes();
  await modifierFAQ(req, res);
  assert(res._json.actif === false, "Désactivation d'une entrée FAQ -> actif=false");

  // Test 4 : getFAQ ne retourne que les entrées actives
  req = {};
  res = fakeRes();
  await getFAQ(req, res);
  assert(res._json.length === 1, "getFAQ ne retourne que les entrées actives (1 sur 2)");

  // Test 5 : getToutesFAQ retourne tout, y compris désactivées (vue admin)
  req = {};
  res = fakeRes();
  await getToutesFAQ(req, res);
  assert(res._json.length === 2, "getToutesFAQ retourne les 2 entrées, actives et désactivées");

  // Test 6 : la recherche (chatbot) fonctionne et ignore les entrées désactivées
  req = { query: { q: "Comment valider mon KYC" } };
  res = fakeRes();
  await rechercherAssistant(req, res);
  assert(res._status === 200, "Recherche assistant -> 200");
  assert(res._json.resultats.length === 1, "Trouve la bonne entrée active");
  assert(res._json.aucuneCorrespondance === false, "aucuneCorrespondance = false quand un résultat est trouvé");

  // Test 7 : recherche sans paramètre q -> refusée
  req = { query: {} };
  res = fakeRes();
  await rechercherAssistant(req, res);
  assert(res._status === 400, "Recherche sans question posée -> 400");

  // Test 8 : recherche sans aucune correspondance
  req = { query: { q: "xyz123nonexistant" } };
  res = fakeRes();
  await rechercherAssistant(req, res);
  assert(res._json.aucuneCorrespondance === true, "aucuneCorrespondance = true quand rien ne correspond");

  // Test 9 : suppression
  req = { params: { id: idFAQ }, user: { _id: "u_admin" } };
  res = fakeRes();
  await supprimerFAQ(req, res);
  assert(res._status === 200, "Suppression d'une entrée FAQ -> 200");
  assert(faqDB[idFAQ] === undefined, "L'entrée est bien retirée");

  // Test 10 : modification d'une entrée introuvable
  req = { params: { id: "faq_inexistant" }, body: { question: "x" }, user: { _id: "u_admin" } };
  res = fakeRes();
  await modifierFAQ(req, res);
  assert(res._status === 404, "Modification d'une entrée introuvable -> 404");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
