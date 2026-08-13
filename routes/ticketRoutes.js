const express = require("express");
const router = express.Router();
const {
  creerTicket,
  getMesTickets,
  getTousLesTickets,
  getTicketById,
  ajouterMessage,
  changerStatutTicket,
} = require("../controllers/ticketController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.post("/", protect, creerTicket);
router.get("/mes-tickets", protect, getMesTickets);
router.get("/", protect, checkRole("admin"), getTousLesTickets);
router.get("/:id", protect, getTicketById);
router.post("/:id/messages", protect, ajouterMessage);
router.put("/:id/statut", protect, changerStatutTicket);

module.exports = router;
