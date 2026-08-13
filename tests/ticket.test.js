const mock = require("mock-require");

let ticketsDB = {};
let counter = 1;
const notifsEnvoyees = [];

function makeTicketDoc(data) {
  const id = "tkt_" + counter++;
  const doc = Object.assign({ _id: id, statut: "ouvert", messages: [] }, data, {
    save: async function () { ticketsDB[id] = doc; return doc; },
  });
  ticketsDB[id] = doc;
  return doc;
}

function buildQuery(getResult) {
  const wrapper = {};
  wrapper.populate = () => wrapper;
  wrapper.sort = () => wrapper;
  wrapper.then = (resolve, reject) => Promise.resolve(getResult()).then(resolve, reject);
  return wrapper;
}

const FakeTicketAssistance = {
  create: async (data) => makeTicketDoc(data),
  findById: (id) => {
    const wrapper = buildQuery(() => ticketsDB[id] || null);
    // La vraie version (non peuplée) est simplement le document stocké —
    // mutable, pour que ticket.statut = X puis ticket.save() fonctionne
    // exactement comme avec un vrai document Mongoose.
    wrapper.populate = () => {
      const populatedWrapper = buildQuery(() => {
        const t = ticketsDB[id];
        if (!t) return null;
        return Object.assign(Object.create(Object.getPrototypeOf(t)), t, {
          auteur: { _id: t.auteur, nom: "Utilisateur Test", email: "test@test.com", role: "client" },
        });
      });
      return populatedWrapper;
    };
    return wrapper;
  },
  find: (filtre = {}) => buildQuery(() => {
    let list = Object.values(ticketsDB);
    if (filtre.auteur) list = list.filter((t) => String(t.auteur) === String(filtre.auteur));
    if (filtre.statut) list = list.filter((t) => t.statut === filtre.statut);
    return list;
  }),
};

const FakeNotification = { create: async (data) => { notifsEnvoyees.push(data); return data; } };

mock("../models/TicketAssistance", FakeTicketAssistance);
mock("../models/Notification", FakeNotification);
mock("../models/JournalAudit", { create: async () => ({}) });

const controllerPath = require.resolve("../controllers/ticketController");
delete require.cache[controllerPath];
const { creerTicket, getMesTickets, getTousLesTickets, getTicketById, ajouterMessage, changerStatutTicket } = require("../controllers/ticketController");

function fakeRes() {
  const res = {};
  res.status = (c) => { res._status = c; return res; };
  res.json = (p) => { res._json = p; return res; };
  return res;
}

async function run() {
  let ok = 0, fail = 0;
  function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

  // Test 1 : refus si sujet ou message manquant
  let req = { body: { sujet: "Problème" }, user: { _id: "u_client", role: "client" } };
  let res = fakeRes();
  await creerTicket(req, res);
  assert(res._status === 400, "Refus si le premier message est manquant");

  // Test 2 : création valide
  req = { body: { sujet: "Mon KYC a été rejeté", categorie: "kyc", message: "Pourquoi mon dossier a-t-il été rejeté ?" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await creerTicket(req, res);
  assert(res._status === 201, "Création d'un ticket -> 201");
  assert(res._json.messages.length === 1, "Le premier message est bien enregistré");
  const idTicket = res._json._id;

  // Test 3 : l'auteur voit son ticket dans "mes tickets"
  req = { user: { _id: "u_client" } };
  res = fakeRes();
  await getMesTickets(req, res);
  assert(res._json.length === 1, "L'auteur voit son propre ticket");

  // Test 4 : un tiers ne peut pas consulter le ticket d'un autre
  req = { params: { id: idTicket }, user: { _id: "u_intrus", role: "client" } };
  res = fakeRes();
  await getTicketById(req, res);
  assert(res._status === 403, "Un tiers ne peut pas consulter le ticket d'un autre");

  // Test 5 : l'admin répond -> statut passe de "ouvert" à "en_cours" automatiquement
  req = { params: { id: idTicket }, body: { texte: "On regarde ça, un instant." }, user: { _id: "u_admin", role: "admin" } };
  res = fakeRes();
  await ajouterMessage(req, res);
  assert(res._status === 200, "L'admin peut répondre -> 200");
  assert(res._json.statut === "en_cours", "Le statut passe automatiquement à en_cours quand l'admin répond");
  assert(res._json.messages.length === 2, "Le message de l'admin est bien ajouté à la conversation");
  assert(notifsEnvoyees.length === 1, "Une notification est envoyée à l'auteur quand l'admin répond");

  // Test 6 : l'auteur peut marquer son ticket comme résolu
  req = { params: { id: idTicket }, body: { statut: "resolu" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await changerStatutTicket(req, res);
  assert(res._json.statut === "resolu", "L'auteur peut marquer son ticket comme résolu");

  // Test 7 : l'auteur NE PEUT PAS fermer définitivement son propre ticket
  req = { params: { id: idTicket }, body: { statut: "ferme" }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await changerStatutTicket(req, res);
  assert(res._status === 403, "Seul un admin peut fermer définitivement un ticket");

  // Test 8 : l'admin PEUT fermer le ticket
  req = { params: { id: idTicket }, body: { statut: "ferme" }, user: { _id: "u_admin", role: "admin" } };
  res = fakeRes();
  await changerStatutTicket(req, res);
  assert(res._json.statut === "ferme", "L'admin peut fermer le ticket");

  // Test 9 : impossible d'ajouter un message à un ticket fermé
  req = { params: { id: idTicket }, body: { texte: "Encore une chose..." }, user: { _id: "u_client", role: "client" } };
  res = fakeRes();
  await ajouterMessage(req, res);
  assert(res._status === 400, "Impossible d'ajouter un message à un ticket fermé");

  // Test 10 : l'admin voit tous les tickets, filtrable par statut
  req = { query: { statut: "ferme" } };
  res = fakeRes();
  await getTousLesTickets(req, res);
  assert(res._json.length === 1, "L'admin voit les tickets filtrés par statut (fermé)");

  console.log(`\n${ok} tests réussis, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
