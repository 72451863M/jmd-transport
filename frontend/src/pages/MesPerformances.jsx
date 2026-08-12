import React, { useEffect, useState } from "react";
import { getMesPerformances } from "../api/livraisonApi";

const CarteStat = ({ valeur, label }) => (
  <div className="card" style={{ flex: 1, minWidth: 150 }}>
    <h3>{valeur}</h3>
    <p>{label}</p>
  </div>
);

const MesPerformances = () => {
  const [perf, setPerf] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getMesPerformances();
        setPerf(data);
      } catch (err) {
        setErreur("Impossible de charger tes performances");
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  if (chargement) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;
  if (erreur) return <div className="container" style={{ paddingTop: 30 }}><p style={{ color: "red" }}>{erreur}</p></div>;

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60 }}>
      <h2 style={{ marginBottom: 20 }}>Mes performances</h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <CarteStat valeur={perf.revenuTotalGenere.toLocaleString()} label="FCFA générés (livraisons livrées)" />
        <CarteStat valeur={perf.nbLivraisonsLivrees} label="Livraisons livrées" />
        <CarteStat valeur={perf.missionsAcceptees} label="Missions acceptées" />
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <CarteStat valeur={perf.scoreFiabilite !== null ? `${perf.scoreFiabilite}/100` : "—"} label="Score de fiabilité" />
        <CarteStat valeur={perf.scoreIA !== null ? `${perf.scoreIA}/100` : "Pas encore calculé"} label="Score IA" />
        <CarteStat valeur={perf.noteMoyenne !== null ? `${perf.noteMoyenne} / 5` : "Aucune note"} label={`Note moyenne (${perf.nbNotes} avis)`} />
      </div>

      {perf.missionsAnnulees > 0 && (
        <p style={{ fontSize: 13, color: "#cc5500" }}>
          {perf.missionsAnnulees} mission(s) annulée(s) après acceptation — ça affecte ton score de fiabilité.
        </p>
      )}
    </div>
  );
};

export default MesPerformances;
