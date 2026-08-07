import React, { useEffect, useState, useRef } from "react";
import { getMesNotifications, getNombreNonLues, marquerCommeLue } from "../api/notificationApi";

const NotificationBell = () => {
  const [ouvert, setOuvert] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [nonLues, setNonLues] = useState(0);
  const ref = useRef(null);

  const chargerCompteur = async () => {
    try {
      const { data } = await getNombreNonLues();
      setNonLues(data.count);
    } catch (err) {
      // silencieux
    }
  };

  useEffect(() => {
    chargerCompteur();
    const intervalle = setInterval(chargerCompteur, 20000); // rafraîchi toutes les 20s
    return () => clearInterval(intervalle);
  }, []);

  useEffect(() => {
    const handleClicExterieur = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOuvert(false);
    };
    document.addEventListener("mousedown", handleClicExterieur);
    return () => document.removeEventListener("mousedown", handleClicExterieur);
  }, []);

  const handleOuvrir = async () => {
    const nouvelEtat = !ouvert;
    setOuvert(nouvelEtat);
    if (nouvelEtat) {
      try {
        const { data } = await getMesNotifications();
        setNotifications(data);
      } catch (err) {
        // silencieux
      }
    }
  };

  const handleClicNotification = async (n) => {
    if (!n.lu) {
      try {
        await marquerCommeLue(n._id);
        setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, lu: true } : x)));
        setNonLues((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // silencieux
      }
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleOuvrir}
        style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 16, position: "relative" }}
        aria-label="Notifications"
      >
        🔔
        {nonLues > 0 && (
          <span
            style={{
              position: "absolute", top: -4, right: -8, background: "#cc3333", color: "white",
              borderRadius: "50%", fontSize: 10, padding: "1px 5px", fontWeight: 700,
            }}
          >
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div
          style={{
            position: "absolute", right: 0, top: "130%", width: 320, maxHeight: 400, overflowY: "auto",
            background: "white", color: "#1a1a1a", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 50,
          }}
        >
          {notifications.length === 0 ? (
            <p style={{ padding: 16, fontSize: 14, color: "#777" }}>Aucune notification.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleClicNotification(n)}
                style={{
                  padding: 12, borderBottom: "1px solid #eee", cursor: "pointer",
                  background: n.lu ? "white" : "#fff7ed",
                }}
              >
                <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{n.titre}</p>
                <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>{n.message}</p>
                <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 0" }}>
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
