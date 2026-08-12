require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const initSocket = require("./socket");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const livraisonRoutes = require("./routes/livraisonRoutes");
const kycRoutes = require("./routes/kycRoutes");
const reclamationRoutes = require("./routes/reclamationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const entrepriseRoutes = require("./routes/entrepriseRoutes");
const corridorRoutes = require("./routes/corridorRoutes");
const biRoutes = require("./routes/biRoutes");
const vehiculeRoutes = require("./routes/vehiculeRoutes");
const chauffeurRoutes = require("./routes/chauffeurRoutes");
const parametreRoutes = require("./routes/parametreRoutes");
const auditRoutes = require("./routes/auditRoutes");

// Connexion à la base de données
connectDB();

const app = express();
const server = http.createServer(app);

// Configuration Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
initSocket(io);

// Middlewares
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
// Limite augmentée (par défaut 100kb) pour accepter les documents KYC et
// preuves de livraison envoyés en base64 depuis le navigateur (jusqu'à 4 Mo
// de fichier d'origine, un peu plus une fois encodé en base64).
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/livraisons", livraisonRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/reclamations", reclamationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/entreprises", entrepriseRoutes);
app.use("/api/corridors", corridorRoutes);
app.use("/api/bi", biRoutes);
app.use("/api/vehicules", vehiculeRoutes);
app.use("/api/chauffeurs", chauffeurRoutes);
app.use("/api/parametres", parametreRoutes);
app.use("/api/audit", auditRoutes);

// Route de test
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "JMD-TRANSPORT API opérationnelle" });
});

// Gestion des routes inconnues
app.use((req, res) => {
  res.status(404).json({ message: "Route non trouvée" });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Erreur serveur interne", error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur JMD-TRANSPORT démarré sur le port ${PORT}`);
});
