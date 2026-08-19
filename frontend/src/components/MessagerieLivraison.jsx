import React, { useEffect, useState, useRef } from "react";
import { getMessagesLivraison, envoyerMessage } from "../api/messageApi";
import { useAuth } from "../context/AuthContext";

const MessagerieLivraison = ({ livraisonId, transporteurAssigne }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const finListeRef = useRef(null);

  const charger = async () => {
    try {
      const { data } = await getMessagesLivraison(livraisonId);
      setMessages(data);
    } catch (err) {
      // silencieux : la messagerie n'est pas bloquante si elle échoue à charger
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    if (transporteurAssigne) charger();
    else setChargement(false);
  }, [livraisonId, transporteurAssigne]);

  const handleEnvoyer = async (e) => {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true);
    try {
      await envoyerMessage(livraisonId, texte.trim());
      setTexte("");
      await charger();
    } catch (err) {
      // silencieux, l'utilisateur peut réessayer
    } finally {
      setEnvoi(false);
    }
  };

  if (!transporteurAssigne) {
    return (
      <p style={{ fontSize: 13, color: "#777", marginTop: 10 }}>
        La messagerie s'ouvre une fois qu'un transporteur a accepté la mission.
      </p>
    );
  }

  if (chargement) return <p style={{ fontSize: 13, color: "#777", marginTop: 10 }}>Chargement de la conversation...</p>;

  return (
    <div style={{ marginTop: 10 }}>
      <h4 style={{ fontSize: 14, marginBottom: 8 }}>Messagerie</h4>
      <p style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>
        Échange interne à la plateforme — aucun numéro de téléphone n'est partagé ici.
      </p>
      <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 10, marginBottom: 8 }}>
        {messages.length === 0 && <p style={{ fontSize: 12, color: "#999" }}>Aucun message pour le moment.</p>}
        {messages.map((m) => {
          const estMoi = m.expediteur?._id === user?._id || m.expediteur === user?._id;
          return (
            <div key={m._id} style={{ display: "flex", justifyContent: estMoi ? "flex-end" : "flex-start", marginBottom: 6 }}>
              <div
                style={{
                  maxWidth: "75%", padding: "6px 10px", borderRadius: 10, fontSize: 13,
                  background: estMoi ? "rgba(244, 102, 27, 0.14)" : "var(--steel-100)", color: "var(--ink-900)",
                }}
              >
                {m.texte}
              </div>
            </div>
          );
        })}
        <div ref={finListeRef} />
      </div>
      <form onSubmit={handleEnvoyer} style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Écrire un message..."
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn" disabled={envoi} style={{ fontSize: 13 }}>
          {envoi ? "..." : "Envoyer"}
        </button>
      </form>
    </div>
  );
};

export default MessagerieLivraison;
