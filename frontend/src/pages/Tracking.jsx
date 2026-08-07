import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { getLivraisonById } from "../api/livraisonApi";
import DocumentsLivraison from "../components/DocumentsLivraison";
import MessagerieLivraison from "../components/MessagerieLivraison";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const Tracking = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [livraison, setLivraison] = useState(null);
  const [position, setPosition] = useState(null);
  const [envoiActif, setEnvoiActif] = useState(false);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    getLivraisonById(id).then(({ data }) => setLivraison(data));

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.emit("rejoindre_livraison", id);

    socket.on("position_mise_a_jour", (data) => {
      setPosition(data);
    });

    return () => {
      socket.disconnect();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [id]);

  // Pour le transporteur : commence à envoyer sa position GPS réelle du navigateur
  const demarrerEnvoiPosition = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par ce navigateur");
      return;
    }

    setEnvoiActif(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        socketRef.current.emit("position_transporteur", {
          livraisonId: id,
          lat: latitude,
          lng: longitude,
        });
        setPosition({ lat: latitude, lng: longitude, horodatage: new Date() });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const arreterEnvoiPosition = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    setEnvoiActif(false);
  };

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60 }}>
      <h2 style={{ marginBottom: 20 }}>Suivi en temps réel</h2>

      {livraison && (
        <div className="card">
          <p><strong>Trajet :</strong> {livraison.adresseDepart.label} → {livraison.adresseArrivee.label}</p>
          <p><strong>Statut :</strong> <span className={`badge ${livraison.statut}`}>{livraison.statut}</span></p>
          <DocumentsLivraison livraisonId={id} />
          <MessagerieLivraison livraisonId={id} transporteurAssigne={!!livraison.transporteur} />
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Position actuelle</h3>
        {position ? (
          <>
            <p>Latitude : {position.lat.toFixed(5)}</p>
            <p>Longitude : {position.lng.toFixed(5)}</p>
            <p style={{ fontSize: 13, color: "#777" }}>
              Mise à jour : {new Date(position.horodatage).toLocaleTimeString()}
            </p>
            <a
              href={`https://www.google.com/maps?q=${position.lat},${position.lng}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#ff6600", fontSize: 14 }}
            >
              Voir sur Google Maps →
            </a>
          </>
        ) : (
          <p>En attente de la position du transporteur...</p>
        )}
      </div>

      {user?.role === "transporteur" && (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Partager ma position</h3>
          {!envoiActif ? (
            <button className="btn" onClick={demarrerEnvoiPosition}>
              Démarrer le partage GPS
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={arreterEnvoiPosition}>
              Arrêter le partage GPS
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Tracking;
