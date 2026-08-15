import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getHistoriqueMissions } from "../api/chauffeurApi";

const LABELS_STATUT = { en_attente: "En attente", acceptee: "Acceptée", en_cours: "En cours", livree: "Livrée", annulee: "Annulée" };

const HistoriqueChauffeur = () => {
  const { id } = useParams();
  const [historique, setHistorique] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getHistoriqueMissions(id);
        setHistorique(data);
      } catch (err) {
        setErreur(err.response?.data?.message || "Impossible de charger l'historique");
      }
    })();
  }, [id]);

  if (erreur) return <div className="container" style={{ paddingTop: 30 }}><p style={{ color: "red" }}>{erreur}</p></div>;
  if (!historique) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 700 }}>
      <h2 style={{ marginBottom: 6 }}>Historique — {historique.chauffeur.nom}</h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: 1, minWidth: 140 }}>
          <h3>{historique.chauffeur.missionsCompletees}</h3>
          <p>Missions complétées</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 140 }}>
          <h3>{historique.chauffeur.noteMoyenne !== null ? `${historique.chauffeur.noteMoyenne} / 5` : "Aucune note"}</h3>
          <p>Note moyenne ({historique.chauffeur.nbNotes} avis)</p>
        </div>
      </div>

      <h3 style={{ marginBottom: 10 }}>Missions ({historique.missions.length})</h3>
      {historique.missions.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>Aucune mission pour le moment.</p>}
      {historique.missions.map((m) => (
        <div key={m._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>{m.adresseDepart.label} → {m.adresseArrivee.label}</strong>
            <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0" }}>{new Date(m.createdAt).toLocaleDateString()} — {m.prix} FCFA</p>
          </div>
          <span className={`badge ${m.statut}`}>{LABELS_STATUT[m.statut] || m.statut}</span>
        </div>
      ))}
    </div>
  );
};

export default HistoriqueChauffeur;
