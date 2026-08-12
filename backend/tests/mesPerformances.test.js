const mock = require("mock-require");

const livraisonsDB = {
  liv1: { _id: "liv1", transporteur: "u_transp1", statut: "livree", prix: 2000 },
  liv2: { _id: "liv2", transporteur: "u_transp1", statut: "livree", prix: 3500 },
  liv3: { _id: "liv3", transporteur: "u_transp1", statut: "en_cours", prix: 1000 }, // pas encore livrée, exclue
  liv4: { _id: "liv4", transporteur: "u_transp2", statut: "livree", prix: 9999 }, // autre transporteur, exclue
};

const FakeLivraison = { find: async (filter) => Object.values(livraisonsDB).filter((l) => String(l.transporteur) === String(filter.transporteur) && l.statut === filter.statut) };

mock("../models/Livraison", FakeLivraison);
mock("../jobs/recalculerScoresIA", { recalculerScoresIA: async () => ({}) });

const controllerPath = require.resolve("../controllers/userController");
delete require.cache[controllerPath];
const { getMesPerformances } = require("../controllers/userController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  const req = {
    user: {
      _id: "u_transp1",
      scoreIA: 78,
      statsFiabilite: { missionsCompletees: 5, missionsAcceptees: 6, missionsAnnuleesParTransporteur: 1, sommeNotes: 22, nbNotes: 5 },
      calculerScoreFiabilite: () => 85,
    },
  };
  const res = fakeRes();
  await getMesPerformances(req, res);

  assert(res._status === 200, "getMesPerformances -> 200");
  assert(res._json.revenuTotalGenere === 5500, "Revenu total = somme des livraisons LIVREES uniquement (2000+3500), exclut en_cours et autres transporteurs");
  assert(res._json.nbLivraisonsLivrees === 2, "2 livraisons livrées comptabilisées");
  assert(res._json.noteMoyenne === 4.4, "Note moyenne calculée correctement (22/5 = 4.4)");
  assert(res._json.scoreFiabilite === 85, "Score de fiabilité récupéré via la méthode du modèle");
  assert(res._json.scoreIA === 78, "Score IA correctement renvoyé");
  assert(res._json.missionsAnnulees === 1, "Missions annulées correctement renvoyées");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
