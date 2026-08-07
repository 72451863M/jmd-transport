const mock = require("mock-require");

let livraisonsDB = {};
let usersDB = {};

function makeLivraisonDoc(data) {
  const doc = Object.assign({
    toObject() { return Object.assign({}, doc); },
    save: async function () { livraisonsDB[doc._id] = doc; return doc; },
  }, data);
  return doc;
}

const FakeLivraison = { findById: async (id) => livraisonsDB[id] || null };

const FakeUser = {
  findByIdAndUpdate: async (id, update) => {
    const u = usersDB[id];
    if (!u) return null;
    if (update.$inc) {
      for (const [path, amount] of Object.entries(update.$inc)) {
        const parts = path.split(".");
        let obj = u;
        for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
        obj[parts[parts.length - 1]] = (obj[parts[parts.length - 1]] || 0) + amount;
      }
    }
    return u;
  },
};

const FakeNotification = { create: async () => ({}) };
mock("../models/Notification", FakeNotification);
mock("../models/Livraison", FakeLivraison);
mock("../models/User", FakeUser);
const controllerPath = require.resolve("../controllers/livraisonController");
delete require.cache[controllerPath];
const { livrerAvecPreuve, updateStatutLivraison } = require("../controllers/livraisonController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  usersDB["u_transp"] = { _id: "u_transp", statsFiabilite: { missionsCompletees: 0, missionsALHeure: 0 } };

  // Test 1 : refus sans nom de destinataire ni preuve
  livraisonsDB["liv1"] = makeLivraisonDoc({ _id: "liv1", client: "u_client", transporteur: "u_transp", statut: "en_cours", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  let req = { params: { id: "liv1" }, body: {}, user: { _id: "u_transp", role: "transporteur" } };
  let res = fakeRes();
  await livrerAvecPreuve(req, res);
  assert(res._status === 400, "Refus si nom du destinataire et preuve manquants");

  // Test 2 : refus si la livraison n'est pas en_cours
  livraisonsDB["liv2"] = makeLivraisonDoc({ _id: "liv2", client: "u_client", transporteur: "u_transp", statut: "acceptee", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv2" }, body: { nomDestinataire: "Awa", signatureUrl: "http://x/sign.png" }, user: { _id: "u_transp", role: "transporteur" } };
  res = fakeRes();
  await livrerAvecPreuve(req, res);
  assert(res._status === 400, "Refus si la livraison n'est pas en_cours (ex: acceptee)");

  // Test 3 : un transporteur non assigné ne peut pas livrer
  livraisonsDB["liv3"] = makeLivraisonDoc({ _id: "liv3", client: "u_client", transporteur: "u_transp", statut: "en_cours", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv3" }, body: { nomDestinataire: "Awa", photoUrl: "http://x/photo.jpg" }, user: { _id: "u_autre_transp", role: "transporteur" } };
  res = fakeRes();
  await livrerAvecPreuve(req, res);
  assert(res._status === 403, "Un transporteur non assigné ne peut pas confirmer la livraison");

  // Test 4 : livraison réussie avec photo -> statut livree + stats mises à jour
  req = { params: { id: "liv3" }, body: { nomDestinataire: "Awa", photoUrl: "http://x/photo.jpg", lat: 12.6, lng: -8.0 }, user: { _id: "u_transp", role: "transporteur" } };
  res = fakeRes();
  await livrerAvecPreuve(req, res);
  assert(res._status === 200, "Livraison avec preuve valide -> 200");
  assert(livraisonsDB["liv3"].statut === "livree", "Statut passe à livree");
  assert(livraisonsDB["liv3"].preuveLivraison.nomDestinataire === "Awa", "Nom du destinataire enregistré");
  assert(usersDB["u_transp"].statsFiabilite.missionsCompletees === 1, "Statistique missionsCompletees incrémentée");
  assert(usersDB["u_transp"].statsFiabilite.missionsALHeure === 1, "Statistique missionsALHeure incrémentée (pas de dateLivraisonPrevue -> jamais en retard)");

  // Test 5 : l'ancienne route générique refuse désormais "livree"
  livraisonsDB["liv4"] = makeLivraisonDoc({ _id: "liv4", client: "u_client", transporteur: "u_transp", statut: "en_cours", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" } });
  req = { params: { id: "liv4" }, body: { statut: "livree" }, user: { _id: "u_transp", role: "transporteur" } };
  res = fakeRes();
  await updateStatutLivraison(req, res);
  assert(res._status === 400, "PUT /:id/statut avec statut=livree est désormais refusé (doit passer par /livrer)");
  assert(livraisonsDB["liv4"].statut === "en_cours", "Statut inchangé après ce refus");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
