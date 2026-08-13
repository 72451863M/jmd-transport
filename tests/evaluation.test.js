const mock = require("mock-require");

let livraisonsDB = {};
let usersDB = {};

function makeLivraisonDoc(data) {
  const doc = Object.assign({
    save: async function () { livraisonsDB[doc._id] = doc; return doc; },
  }, data);
  return doc;
}

const FakeLivraison = {
  findById: async (id) => livraisonsDB[id] || null,
};

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
const { evaluerLivraison } = require("../controllers/livraisonController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  usersDB["u_transp"] = { _id: "u_transp", statsFiabilite: { sommeNotes: 0, nbNotes: 0 } };

  // Test 1 : impossible d'évaluer une livraison qui n'est pas "livree"
  livraisonsDB["liv1"] = makeLivraisonDoc({
    _id: "liv1", client: "u_client", transporteur: "u_transp", statut: "en_cours", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" },
    evaluation: { clientVersTransporteur: { note: null }, transporteurVersClient: { note: null } },
  });
  let req = { params: { id: "liv1" }, body: { note: 5 }, user: { _id: "u_client", role: "client" } };
  let res = fakeRes();
  await evaluerLivraison(req, res);
  assert(res._status === 400, "Évaluation refusée si la livraison n'est pas livrée");

  // Test 2 : le client évalue le transporteur -> statsFiabilite mis à jour
  livraisonsDB["liv2"] = makeLivraisonDoc({
    _id: "liv2", client: "u_client", transporteur: "u_transp", statut: "livree", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" },
    evaluation: { clientVersTransporteur: { note: null }, transporteurVersClient: { note: null } },
  });
  req = { params: { id: "liv2" }, body: { note: 4, commentaire: "Bon transporteur" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await evaluerLivraison(req, res);
  assert(res._status === 200, "Évaluation client -> 200");
  assert(livraisonsDB["liv2"].evaluation.clientVersTransporteur.note === 4, "Note enregistrée sur la livraison");
  assert(usersDB["u_transp"].statsFiabilite.sommeNotes === 4 && usersDB["u_transp"].statsFiabilite.nbNotes === 1, "statsFiabilite du transporteur mise à jour (alimente le score de fiabilité)");

  // Test 3 : impossible d'évaluer deux fois
  req = { params: { id: "liv2" }, body: { note: 5 }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await evaluerLivraison(req, res);
  assert(res._status === 400, "Double évaluation refusée");
  assert(usersDB["u_transp"].statsFiabilite.nbNotes === 1, "Pas de double comptage suite au refus");

  // Test 4 : note hors limites refusée
  livraisonsDB["liv3"] = makeLivraisonDoc({
    _id: "liv3", client: "u_client", transporteur: "u_transp", statut: "livree", adresseDepart: { label: "A" }, adresseArrivee: { label: "B" },
    evaluation: { clientVersTransporteur: { note: null }, transporteurVersClient: { note: null } },
  });
  req = { params: { id: "liv3" }, body: { note: 8 }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await evaluerLivraison(req, res);
  assert(res._status === 400, "Note hors limites (8/5) refusée");

  // Test 5 : un tiers non concerné ne peut pas évaluer
  req = { params: { id: "liv3" }, body: { note: 3 }, user: { _id: "u_inconnu", role: "client" } };
  res = fakeRes();
  await evaluerLivraison(req, res);
  assert(res._status === 403, "Un utilisateur non concerné par la livraison ne peut pas l'évaluer");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
