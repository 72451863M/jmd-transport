const mock = require("mock-require");

let vehiculesDB = {};
let maintenanceDB = {};
let counter = 1;

function buildListQuery(list) {
  const wrapper = {};
  wrapper.sort = () => wrapper;
  wrapper.then = (resolve, reject) => Promise.resolve(list).then(resolve, reject);
  return wrapper;
}

const FakeVehicule = {
  findById: async (id) => vehiculesDB[id] || null,
  find: (filtre = {}) => {
    let list = Object.values(vehiculesDB);
    if (filtre.proprietaire) list = list.filter((v) => String(v.proprietaire) === String(filtre.proprietaire));
    if (filtre.actif !== undefined) list = list.filter((v) => v.actif === filtre.actif);
    return buildListQuery(list);
  },
};

const FakeMaintenanceVehicule = {
  create: async (data) => {
    const id = "maint_" + counter++;
    const doc = Object.assign({ _id: id }, data);
    maintenanceDB[id] = doc;
    return doc;
  },
  find: (filtre = {}) => {
    let list = Object.values(maintenanceDB);
    if (filtre.vehicule) list = list.filter((m) => String(m.vehicule) === String(filtre.vehicule));
    return buildListQuery(list);
  },
};

mock("../models/Vehicule", FakeVehicule);
mock("../models/MaintenanceVehicule", FakeMaintenanceVehicule);
mock("../models/JournalAudit", { create: async () => ({}) });

const controllerPath = require.resolve("../controllers/maintenanceController");
delete require.cache[controllerPath];
const { ajouterMaintenance, getHistoriqueMaintenance, getEcheancesProches } = require("../controllers/maintenanceController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  vehiculesDB["veh1"] = {
    _id: "veh1", proprietaire: "u_transp1", immatriculation: "ML-1234-AB", actif: true,
    kilometrageActuel: 50000, dateProchainControleTechnique: null, dateExpirationAssurance: null,
    save: async function () { vehiculesDB[this._id] = this; return this; },
  };

  // Test 1 : type de maintenance invalide refusé
  let req = { body: { vehiculeId: "veh1", type: "peinture", description: "Test", dateRealisee: "2026-08-01" }, user: { _id: "u_transp1" } };
  let res = fakeRes();
  await ajouterMaintenance(req, res);
  assert(res._status === 400, "Type de maintenance invalide -> 400");

  // Test 2 : ajout valide d'une vidange avec kilométrage
  req = {
    body: { vehiculeId: "veh1", type: "vidange", description: "Vidange complète", dateRealisee: "2026-08-01", kilometrageAuMoment: 52000, cout: 25000 },
    user: { _id: "u_transp1" },
  };
  res = fakeRes();
  await ajouterMaintenance(req, res);
  assert(res._status === 201, "Ajout d'une vidange -> 201");
  assert(vehiculesDB["veh1"].kilometrageActuel === 52000, "Le kilométrage du véhicule est mis à jour avec la valeur la plus récente");

  // Test 3 : un kilométrage plus ancien ne fait pas reculer le compteur
  req = {
    body: { vehiculeId: "veh1", type: "pneus", description: "Changement pneus avant", dateRealisee: "2026-07-01", kilometrageAuMoment: 48000 },
    user: { _id: "u_transp1" },
  };
  res = fakeRes();
  await ajouterMaintenance(req, res);
  assert(vehiculesDB["veh1"].kilometrageActuel === 52000, "Un kilométrage antérieur ne fait pas reculer le compteur du véhicule");

  // Test 4 : refus si le véhicule n'appartient pas au transporteur
  req = { body: { vehiculeId: "veh1", type: "entretien", description: "Test", dateRealisee: "2026-08-01" }, user: { _id: "u_intrus" } };
  res = fakeRes();
  await ajouterMaintenance(req, res);
  assert(res._status === 403, "Refus si le véhicule n'appartient pas au transporteur");

  // Test 5 : historique de maintenance du véhicule
  req = { params: { id: "veh1" }, user: { _id: "u_transp1" } };
  res = fakeRes();
  await getHistoriqueMaintenance(req, res);
  assert(res._status === 200, "Consultation de l'historique -> 200");
  assert(res._json.interventions.length === 2, "Les 2 interventions apparaissent bien dans l'historique");
  assert(res._json.vehicule.kilometrageActuel === 52000, "Le kilométrage courant du véhicule est bien remonté");

  // Test 6 : échéances proches — aucune tant que rien n'est renseigné
  req = { user: { _id: "u_transp1" } };
  res = fakeRes();
  await getEcheancesProches(req, res);
  assert(res._json.echeances.length === 0, "Aucune échéance si rien n'a été renseigné (pas d'invention de date)");

  // Test 7 : une échéance de contrôle technique dans 10 jours -> détectée comme proche
  const dans10Jours = new Date();
  dans10Jours.setDate(dans10Jours.getDate() + 10);
  vehiculesDB["veh1"].dateProchainControleTechnique = dans10Jours;
  req = { user: { _id: "u_transp1" } };
  res = fakeRes();
  await getEcheancesProches(req, res);
  assert(res._json.echeances.length === 1, "Une échéance dans 10 jours est détectée comme proche (fenêtre de 30 jours)");
  assert(res._json.echeances[0].type === "controle_technique", "Le type d'échéance est correctement identifié");
  assert(res._json.echeances[0].depassee === false, "Une échéance future n'est pas marquée comme dépassée");

  // Test 8 : une échéance déjà passée est marquée comme dépassée
  const ilYA5Jours = new Date();
  ilYA5Jours.setDate(ilYA5Jours.getDate() - 5);
  vehiculesDB["veh1"].dateExpirationAssurance = ilYA5Jours;
  req = { user: { _id: "u_transp1" } };
  res = fakeRes();
  await getEcheancesProches(req, res);
  assert(res._json.echeances.length === 2, "Les 2 échéances (contrôle technique + assurance) apparaissent");
  const echeanceAssurance = res._json.echeances.find((e) => e.type === "assurance");
  assert(echeanceAssurance.depassee === true, "Une échéance déjà passée est bien marquée comme dépassée");

  // Test 9 : une échéance lointaine (dans 90 jours) n'apparaît pas
  const dans90Jours = new Date();
  dans90Jours.setDate(dans90Jours.getDate() + 90);
  vehiculesDB["veh2"] = {
    _id: "veh2", proprietaire: "u_transp1", immatriculation: "ML-5678-CD", actif: true,
    dateProchainControleTechnique: dans90Jours, dateExpirationAssurance: null,
    save: async function () { vehiculesDB[this._id] = this; return this; },
  };
  req = { user: { _id: "u_transp1" } };
  res = fakeRes();
  await getEcheancesProches(req, res);
  assert(res._json.echeances.length === 2, "Une échéance dans 90 jours n'apparaît pas encore (hors fenêtre de 30 jours)");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
