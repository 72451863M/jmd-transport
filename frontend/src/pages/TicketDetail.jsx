import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTicketById, ajouterMessageTicket, changerStatutTicket } from "../api/ticketApi";

const LABELS_STATUT = { ouvert: "Ouvert", en_cours: "En cours", resolu: "Résolu", ferme: "Fermé" };

const TicketDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = async () => {
    try {
      const { data } = await getTicketById(id);
      setTicket(data);
    } catch (err) {
      setErreur("Impossible de charger ce ticket");
    }
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEnvoyer = async (e) => {
    e.preventDefault();
    if (!texte.trim()) return;
    try {
      await ajouterMessageTicket(id, texte);
      setTexte("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'envoi");
    }
  };

  const handleChangerStatut = async (statut) => {
    try {
      await changerStatutTicket(id, statut);
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors du changement de statut");
    }
  };

  if (erreur && !ticket) return <div className="container" style={{ paddingTop: 30 }}><p style={{ color: "red" }}>{erreur}</p></div>;
  if (!ticket) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

  const ticketFerme = ticket.statut === "ferme";

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{ticket.sujet}</h2>
        <span className={`badge ${ticket.statut}`}>{LABELS_STATUT[ticket.statut]}</span>
      </div>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      <div className="card">
        {ticket.messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, textAlign: m.role === "admin" ? "left" : "right" }}>
            <div style={{ display: "inline-block", maxWidth: "80%", background: m.role === "admin" ? "#f4f6f8" : "#fff3e0", borderRadius: 8, padding: "8px 12px" }}>
              <p style={{ fontSize: 11, color: "#999", margin: "0 0 4px", fontWeight: 700 }}>{m.role === "admin" ? "Support" : "Toi"}</p>
              <p style={{ fontSize: 14, margin: 0 }}>{m.texte}</p>
            </div>
            <p style={{ fontSize: 10, color: "#bbb", margin: "2px 0 0" }}>{new Date(m.envoyeLe).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {!ticketFerme ? (
        <form onSubmit={handleEnvoyer} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Écrire un message..." style={{ flex: 1 }} />
          <button type="submit" className="btn">Envoyer</button>
        </form>
      ) : (
        <p style={{ fontSize: 13, color: "#777", marginBottom: 16 }}>Ce ticket est fermé — impossible d'ajouter un message.</p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ticket.statut !== "resolu" && !ticketFerme && (
          <button className="btn btn-secondary" onClick={() => handleChangerStatut("resolu")} style={{ fontSize: 13 }}>
            Marquer comme résolu
          </button>
        )}
        {ticket.statut === "resolu" && !ticketFerme && (
          <button className="btn btn-secondary" onClick={() => handleChangerStatut("ouvert")} style={{ fontSize: 13 }}>
            Rouvrir
          </button>
        )}
        {user?.role === "admin" && !ticketFerme && (
          <button onClick={() => handleChangerStatut("ferme")} style={{ background: "none", border: "1px solid #cc3333", color: "#cc3333", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
            Fermer définitivement
          </button>
        )}
      </div>
    </div>
  );
};

export default TicketDetail;
