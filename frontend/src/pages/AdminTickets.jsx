import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTousLesTickets } from "../api/ticketApi";

const LABELS_STATUT = { ouvert: "Ouvert", en_cours: "En cours", resolu: "Résolu", ferme: "Fermé" };
const LABELS_CATEGORIE = { kyc: "KYC", compte: "Compte", paiement: "Paiement", flotte: "Flotte", technique: "Technique", autre: "Autre" };

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [filtreStatut, setFiltreStatut] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = async (statut) => {
    setChargement(true);
    try {
      const { data } = await getTousLesTickets(statut || undefined);
      setTickets(data);
    } catch (err) {
      setErreur("Impossible de charger les tickets");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger(filtreStatut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtreStatut]);

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 750 }}>
      <h2 style={{ marginBottom: 20 }}>Tickets d'assistance</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={`btn ${filtreStatut === "" ? "" : "btn-secondary"}`} onClick={() => setFiltreStatut("")} style={{ fontSize: 12, padding: "6px 12px" }}>
          Tous
        </button>
        {Object.entries(LABELS_STATUT).map(([val, label]) => (
          <button key={val} className={`btn ${filtreStatut === val ? "" : "btn-secondary"}`} onClick={() => setFiltreStatut(val)} style={{ fontSize: 12, padding: "6px 12px" }}>
            {label}
          </button>
        ))}
      </div>

      {chargement ? (
        <p>Chargement...</p>
      ) : tickets.length === 0 ? (
        <p style={{ fontSize: 13, color: "#777" }}>Aucun ticket pour ce filtre.</p>
      ) : (
        tickets.map((t) => (
          <Link key={t._id} to={`/assistance/tickets/${t._id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{t.sujet}</strong>
                <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0" }}>
                  {LABELS_CATEGORIE[t.categorie]} — {t.auteur?.nom} ({t.auteur?.role}) — {t.messages.length} message(s)
                </p>
              </div>
              <span className={`badge ${t.statut}`}>{LABELS_STATUT[t.statut]}</span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
};

export default AdminTickets;
