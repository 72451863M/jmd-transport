const mock = require("mock-require");
const { verifierDossierComplet } = require("../utils/kyc");

let usersDB = {};
let notifsEnvoyees = [];

function makeUserDoc(data) {
  const doc = Object.assign({ save: async function () { usersDB[doc._id] = doc; return doc; } }, data);
  usersDB[doc._id] = doc;
  return doc;
}

const FakeUser = { findById: async (id) => usersDB[id] || null };
const FakeNotification = { create: async (data) => { notifsEnvoyees.push(data); return data; } };

mock("../models/User", FakeUser);
mock("../models/Notification", FakeNotification);

const kycControllerPath = require.resolve("../controllers/kycController");
delete require.cache[kycControllerPath];
const { relancerKYC } = require("../controllers/kycController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : relance d'un transporteur avec dossier incomplet
  makeUserDoc({
    _id: "u_transp1", role: "transporteur",
    kyc: { documents: [{ type: "cni_nina" }], derniereRelanceLe: null },
  });
  let req = { params: { userId: "u_transp1" } };
  let res = fakeRes();
  await relancerKYC(req, res);
  assert(res._status === 200, "Relance envoyée -> 200");
  assert(res._json.manquants.includes("permis_conduire") && res._json.manquants.includes("carte_grise"), "Documents manquants correctement identifiés");
  assert(notifsEnvoyees.length === 1 && notifsEnvoyees[0].type === "kyc_relance", "Notification de type kyc_relance envoyée");
  assert(usersDB["u_transp1"].kyc.derniereRelanceLe !== null, "Date de dernière relance enregistrée");

  // Test 2 : refus de relancer un dossier déjà complet
  makeUserDoc({
    _id: "u_transp2", role: "transporteur",
    kyc: { documents: [{ type: "cni_nina" }, { type: "permis_conduire" }, { type: "carte_grise" }], derniereRelanceLe: null },
  });
  req = { params: { userId: "u_transp2" } };
  res = fakeRes();
  notifsEnvoyees = [];
  await relancerKYC(req, res);
  assert(res._status === 400, "Relance refusée si le dossier est déjà complet");
  assert(notifsEnvoyees.length === 0, "Aucune notification envoyée dans ce cas");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
