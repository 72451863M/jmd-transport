import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { getLivraisonById, getSuiviGPS } from "../api/livraisonApi";
import DocumentsLivraison from "../components/DocumentsLivraison";
import MessagerieLivraison from "../components/MessagerieLivraison";
import CarteSuiviGPS from "../components/CarteSuiviGPS";
import { getMonGroupeCollaboratif } from "../api/collaboratifApi";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const Tracking = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [livraison, setLivraison] = useState(null);
  const [position, setPosition] = useState(null);
  const [envoiActif, setEnvoiActif] = useState(false);
  const [suiviGPS, setSuiviGPS] = useState(null);
  const [alerteDeviationDirecte, setAlerteDeviationDirecte] = useState(null);
  const [groupeCollaboratif, setGroupeCollaboratif] = useState(null);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  const chargerSuiviGPS = async () => {
    try {
      const { data } = await getSuiviGPS(id);
      setSuiviGPS(data);
      if (data.positionActuelle) setPosition(data.positionActuelle);
    } catch (err) {
      // silencieux : le suivi GPS n'est pas bloquant pour le reste de la page
    }
  };

  useEffect(() => {
    getLivraisonById(id).then(({ data }) => setLivraison(data));
    getMonGroupeCollaboratif(id)
      .then(({ data }) => setGroupeCollaboratif(data))
      .catch(() => {}); // silencieux : la plupart des livraisons n'ont pas de groupe (404 attendu)
    chargerSuiviGPS();

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.emit("rejoindre_livraison", id);

    socket.on("position_mise_a_jour", (data) => {
      setPosition(data);
      // Recharge le suivi complet (itinéraire, arrêts) à intervalle raisonnable
      // plutôt qu'à chaque point GPS, pour ne pas surcharger l'API.
      chargerSuiviGPS();
    });

    socket.on("alerte_deviation", (alerte) => {
      setAlerteDeviationDirecte(alerte);
    });

    return () => {
      socket.disconnect();
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const alerteDeviation = alerteDeviationDirecte || suiviGPS?.alerteDeviation;

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

      {suiviGPS?.retard?.detecte && (
        <div className="card" style={{ background: "#fff3e0", border: "1px solid #cc5500" }}>
          <p style={{ color: "#cc5500", fontWeight: 700, margin: 0 }}>
            ⚠ Retard détecté par rapport à l'heure de livraison prévue
            {suiviGPS.retard.dateLivraisonPrevue && ` (${new Date(suiviGPS.retard.dateLivraisonPrevue).toLocaleString()})`}
          </p>
        </div>
      )}

      {alerteDeviation?.enDeviation && (
        <div className="card" style={{ background: "#ffebee", border: "1px solid #cc3333" }}>
          <p style={{ color: "#cc3333", fontWeight: 700, margin: 0 }}>
            🚨 Alerte : le transporteur s'écarte de l'itinéraire attendu (à environ {alerteDeviation.distanceKm} km,
            seuil de tolérance {alerteDeviation.seuilKm} km).
          </p>
          <p style={{ fontSize: 12, color: "#777", margin: "6px 0 0" }}>
            Estimation à vol d'oiseau par rapport à la ligne départ→arrivée — pas le vrai tracé routier
            (aucun service de routage payant n'est branché sur cette version).
          </p>
        </div>
      )}

      {groupeCollaboratif && (
        <div className="card" style={{ background: "#f0f9f0", border: "1px solid #33a852" }}>
          <h3 style={{ marginBottom: 6, fontSize: 16 }}>🤝 Transport collaboratif</h3>
          <p style={{ fontSize: 13, margin: "0 0 8px" }}>
            Ton colis partage ce trajet avec {groupeCollaboratif.nombreParticipants - 1} autre(s) client(s).
            {groupeCollaboratif.maPart && (
              <> Économie estimée : <strong>{groupeCollaboratif.maPart.economie.toLocaleString()} FCFA</strong>.</>
            )}
          </p>
          {groupeCollaboratif.autresLivraisons.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>Autres arrêts de ce groupe :</p>
              {groupeCollaboratif.autresLivraisons.map((l, i) => (
                <p key={i} style={{ fontSize: 12, color: "#777", margin: "2px 0" }}>
                  📍 {l.villeLivraison} {l.heureEstimee && `— vers ${new Date(l.heureEstimee).toLocaleString()}`}
                </p>
              ))}
              <p style={{ fontSize: 11, color: "#999", marginTop: 6 }}>
                Par confidentialité, seuls la ville et l'horaire des autres colis sont visibles — jamais leur nom,
                téléphone ou contenu.
              </p>
            </>
          )}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Carte</h3>
        <CarteSuiviGPS
          positionActuelle={position}
          itineraire={suiviGPS?.itineraireParcouru}
          adresseDepart={livraison?.adresseDepart}
          adresseArrivee={livraison?.adresseArrivee}
          arrets={suiviGPS?.arrets}
        />
      </div>

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

      {suiviGPS?.arrets?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Arrêts détectés ({suiviGPS.arrets.length})</h3>
          {suiviGPS.arrets.map((a, i) => (
            <p key={i} style={{ fontSize: 14, margin: "4px 0" }}>
              Arrêt de <strong>{a.dureeMinutes} min</strong> — de {new Date(a.debut).toLocaleTimeString()} à {new Date(a.fin).toLocaleTimeString()}
            </p>
          ))}
        </div>
      )}

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
