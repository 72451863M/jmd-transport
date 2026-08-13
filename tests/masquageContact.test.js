const mock = require("mock-require");
let livraisonsDB = {};

function makeLivraisonDoc(data) {
  const doc = Object.assign({
    toObject() { return Object.assign({}, doc); },
    save: async function () { livraisonsDB[doc._id] = doc; return doc; },
  }, data);
  return doc;
}
function buildListQueryResult(list) {
  const wrapper = Promise.resolve(list);
  wrapper.populate = () => wrapper;
  wrapper.sort = () => wrapper;
  return wrapper;
}
const FakeLivraison = {
  find: (filter) => {
    let list = Object.values(livraisonsDB);
    if (filter.client) list = list.filter((l) => l.client._id === filter.client);
    if (filter.$or) {
      list = list.filter((l) =>
        filter.$or.some((c) => (c.transporteur && l.transporteur && l.transporteur._id === c.transporteur) || (c.statut && l.statut === c.statut))
      );
    }
    return buildListQueryResult(list);
  },
};
mock("../models/Livraison", FakeLivraison);
mock("../models/User", {});
mock("../models/Document", {});
const { getLivraisons } = require("../controllers/livraisonController");

livraisonsDB["liv1"] = makeLivraisonDoc({
  _id: "liv1", statut: "en_attente",
  client: { _id: "u_client", nom: "Aicha Diarra", telephone: "+22376000000" },
  transporteur: null, adresseDepart: { label: "A" }, adresseArrivee: { label: "B" },
});
livraisonsDB["liv2"] = makeLivraisonDoc({
  _id: "liv2", statut: "acceptee",
  client: { _id: "u_client", nom: "Aicha Diarra", telephone: "+22376000000" },
  transporteur: { _id: "u_transp", nom: "Ibrahim" }, adresseDepart: { label: "A" }, adresseArrivee: { label: "B" },
});

function fakeRes() { const r = {}; r.status = (c) => { r._status = c; return r; }; r.json = (p) => { r._json = p; return r; }; return r; }

let ok = 0, fail = 0;
function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

(async () => {
  // Transporteur navigue la bourse de fret : la mission en_attente ne lui appartient pas -> téléphone masqué
  let req = { user: { _id: "u_transp", role: "transporteur" } };
  let res = fakeRes();
  await getLivraisons(req, res);
  const liv1 = res._json.find((l) => l._id === "liv1");
  const liv2 = res._json.find((l) => l._id === "liv2");
  assert(liv1.client.telephone === null, "Téléphone masqué pour une mission en_attente pas encore acceptée");
  assert(liv1.client.nom === "Aicha Diarra", "Nom du client reste visible (pas de sur-masquage)");
  assert(liv2.client.telephone === "+22376000000", "Téléphone révélé pour une mission déjà acceptée par ce transporteur");

  // Le client voit toujours son propre téléphone sur sa propre demande en_attente
  req = { user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await getLivraisons(req, res);
  const livClient = res._json.find((l) => l._id === "liv1");
  assert(livClient.client.telephone === "+22376000000", "Le client voit toujours son propre téléphone");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
})();
