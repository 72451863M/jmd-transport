const express = require("express");
const router = express.Router();
const {
  estimerPrix,
  creerLivraison,
  getLivraisons,
  getLivraisonById,
  accepterLivraison,
  updateStatutLivraison,
  evaluerLivraison,
  livrerAvecPreuve,
  getSuiviGPS,
} = require("../controllers/livraisonController");
const { getDocumentsLivraison, ajouterDocument } = require("../controllers/documentController");
const { envoyerMessage, getMessagesLivraison } = require("../controllers/messageController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.post("/estimation", protect, checkRole("client"), estimerPrix);
router.post("/", protect, checkRole("client"), creerLivraison);
router.get("/", protect, getLivraisons);
router.get("/:id", protect, getLivraisonById);
router.put("/:id/accepter", protect, checkRole("transporteur"), accepterLivraison);
router.put("/:id/statut", protect, updateStatutLivraison);
router.post("/:id/livrer", protect, checkRole("transporteur"), livrerAvecPreuve);
router.post("/:id/evaluer", protect, evaluerLivraison);
router.get("/:id/documents", protect, getDocumentsLivraison);
router.post("/:id/documents", protect, ajouterDocument);
router.get("/:id/messages", protect, getMessagesLivraison);
router.post("/:id/messages", protect, envoyerMessage);
router.get("/:id/suivi-gps", protect, getSuiviGPS);

module.exports = router;
