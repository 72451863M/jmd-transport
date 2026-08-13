const express = require("express");
const router = express.Router();
const { getJournalAudit } = require("../controllers/auditController");
const { protect } = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.get("/", protect, checkRole("admin"), getJournalAudit);

module.exports = router;
