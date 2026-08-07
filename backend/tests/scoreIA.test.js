const mock = require("mock-require");

// On construit de vrais documents Mongoose User (pour bénéficier de la vraie
// méthode calculerScoreFiabilite), mais on intercepte User.find/save pour
// éviter toute connexion à une vraie base de données.
const RealUserModel = require("../models/User");

function makeTransporteur(data) {
  const doc = new RealUserModel(Object.assign({
    nom: "T", email: `${Math.random()}@test.com`, telephone: "x", password: "123456", role: "transporteur", actif: true,
  }, data));
  doc.save = async function () { return doc; }; // court-circuite la vraie sauvegarde Mongoose
  return doc;
}

const transporteurs = [
  makeTransporteur({ statsFiabilite: { missionsCompletees: 30, missionsALHeure: 27, missionsAcceptees: 15, missionsAnnuleesParTransporteur: 1, sommeNotes: 135, nbNotes: 30 } }),
  makeTransporteur({ statsFiabilite: { missionsCompletees: 2, missionsALHeure: 0, missionsAcceptees: 2, missionsAnnuleesParTransporteur: 0, sommeNotes: 6, nbNotes: 2 } }),
  makeTransporteur({}), // sans historique -> ne doit pas être mis à jour
];

const FakeUserStatic = {
  find: async () => transporteurs,
};

mock("../models/User", FakeUserStatic);
const jobPath = require.resolve("../jobs/recalculerScoresIA");
delete require.cache[jobPath];
const { recalculerScoresIA } = require("../jobs/recalculerScoresIA");

(async () => {
  const resultat = await recalculerScoresIA();
  console.log("Résultat:", resultat);
  console.assert(resultat.traites === 3, "Doit traiter 3 transporteurs");
  console.assert(resultat.misAJour === 2, "Doit mettre à jour seulement les 2 avec historique");
  console.assert(transporteurs[0].scoreIA !== null, "Transporteur expérimenté : score mis à jour");
  console.assert(transporteurs[1].scoreIA !== null, "Nouveau transporteur : score mis à jour");
  console.assert(transporteurs[2].scoreIA === null, "Sans historique : score reste null");
  console.assert(transporteurs[0].scoreIACalculeLe instanceof Date, "Date de calcul renseignée");
  console.log("\n✅ Tous les tests du job recalculerScoresIA passent");
})();
