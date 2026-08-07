const mock = require("mock-require");

let notifStore = {};
let counter = 1;

function makeDoc(data) {
  const id = "notif_" + counter++;
  const doc = Object.assign({ _id: id, lu: false }, data, {
    save: async function () { notifStore[id] = doc; return doc; },
  });
  notifStore[id] = doc;
  return doc;
}

const FakeNotification = {
  create: async (data) => makeDoc(data),
  findById: async (id) => notifStore[id] || null,
  find: (filter = {}) => {
    let list = Object.values(notifStore);
    if (filter.destinataire) list = list.filter((n) => String(n.destinataire) === String(filter.destinataire));
    if (filter.lu !== undefined) list = list.filter((n) => n.lu === filter.lu);
    const wrapper = Promise.resolve(list);
    wrapper.sort = () => wrapper;
    return wrapper;
  },
};

mock("../models/Notification", FakeNotification);

// Test du service utilitaire notifier() directement
const notifPath = require.resolve("../utils/notifications");
delete require.cache[notifPath];
const { notifier } = require("../utils/notifications");

const controllerPath = require.resolve("../controllers/notificationController");
delete require.cache[controllerPath];
const { getMesNotifications, getNombreNonLues, marquerCommeLue } = require("../controllers/notificationController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : notifier() sans destinataire ne crée rien et ne plante pas
  const r1 = await notifier({ type: "mission_acceptee", titre: "x", message: "x" });
  assert(r1 === null, "notifier() sans destinataire retourne null sans planter");

  // Test 2 : création normale
  const r2 = await notifier({ destinataire: "u1", type: "mission_acceptee", titre: "Transporteur trouvé", message: "test" });
  assert(r2 !== null && r2.destinataire === "u1", "notifier() crée bien la notification");

  await notifier({ destinataire: "u1", type: "livraison_livree", titre: "Livrée", message: "test2" });
  await notifier({ destinataire: "u2", type: "kyc_valide", titre: "KYC", message: "test3" });

  // Test 3 : liste des notifications d'un utilisateur
  let req = { user: { _id: "u1" } };
  let res = fakeRes();
  await getMesNotifications(req, res);
  assert(res._status === 200 && res._json.length === 2, "u1 a bien 2 notifications, u2 n'en pollue pas la liste");

  // Test 4 : compteur de non-lues
  res = fakeRes();
  await getNombreNonLues(req, res);
  assert(res._json.count === 2, "Compteur de non-lues correct (2)");

  // Test 5 : marquer comme lue
  const idNotif = Object.values(notifStore).find((n) => n.destinataire === "u1")._id;
  req = { params: { id: idNotif }, user: { _id: "u1" } };
  res = fakeRes();
  await marquerCommeLue(req, res);
  assert(res._status === 200 && notifStore[idNotif].lu === true, "Notification marquée comme lue");

  res = fakeRes();
  await getNombreNonLues({ user: { _id: "u1" } }, res);
  assert(res._json.count === 1, "Compteur de non-lues décrémenté après lecture");

  // Test 6 : un utilisateur ne peut pas marquer comme lue la notification d'un autre
  const idNotifU2 = Object.values(notifStore).find((n) => n.destinataire === "u2")._id;
  req = { params: { id: idNotifU2 }, user: { _id: "u1" } };
  res = fakeRes();
  await marquerCommeLue(req, res);
  assert(res._status === 403, "u1 ne peut pas marquer comme lue une notification de u2");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
