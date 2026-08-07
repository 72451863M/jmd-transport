// Gestion du tracking GPS en temps réel via Socket.io
//
// Événements côté client (frontend) :
//   - "rejoindre_livraison"   { livraisonId }        -> rejoint la room de suivi
//   - "position_transporteur" { livraisonId, lat, lng } -> le transporteur envoie sa position
//
// Événements émis vers les clients :
//   - "position_mise_a_jour" { lat, lng, horodatage }  -> diffusé à tous ceux qui suivent la livraison

const Livraison = require("./models/Livraison");

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Nouvelle connexion socket : ${socket.id}`);

    // Le client (ou l'admin) rejoint la room correspondant à une livraison
    socket.on("rejoindre_livraison", (livraisonId) => {
      socket.join(`livraison_${livraisonId}`);
      console.log(`Socket ${socket.id} suit la livraison ${livraisonId}`);
    });

    // Le transporteur envoie sa position en temps réel
    socket.on("position_transporteur", async ({ livraisonId, lat, lng }) => {
      try {
        const horodatage = new Date();

        // Sauvegarde dans l'historique de la livraison (optionnel mais utile)
        await Livraison.findByIdAndUpdate(livraisonId, {
          $push: { positionsTrajet: { lat, lng, horodatage } },
        });

        // Diffuse la nouvelle position à tous ceux qui suivent cette livraison
        io.to(`livraison_${livraisonId}`).emit("position_mise_a_jour", {
          lat,
          lng,
          horodatage,
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la position :", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Déconnexion socket : ${socket.id}`);
    });
  });
};

module.exports = initSocket;
