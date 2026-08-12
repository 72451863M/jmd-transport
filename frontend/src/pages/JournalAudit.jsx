import React, { useEffect, useState } from "react";
import { getJournalAudit } from "../api/auditApi";

const LABELS_TYPE_ACTION = {
  connexion: "Connexion",
  modification: "Modification",
  suppression: "Suppression",
  paiement: "Paiement",
  validation: "Validation",
};

const COULEURS_TYPE_ACTION = {
  connexion: "#1a3c6e",
  modification: "#cc5500",
  suppression: "#cc3333",
  paiement: "#33a852",
  validation: "#7b3fcc",
};

const JournalAudit = () => {
  const [entrees, setEntrees] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [filtreType, setFiltreType] = useState("");

  const charger = async (typeAction) => {
    setChargement(true);
    try {
      const { data } = await getJournalAudit({ typeAction: typeAction || undefined, limite: 100 });
      setEntrees(data);
    } catch (err) {
      setErreur("Impossible de charger le journal d'audit");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger(filtreType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtreType]);

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 750 }}>
      <h2 style={{ marginBottom: 6 }}>Journal d'audit</h2>
      <p style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>
        Enregistre les actions importantes de la plateforme : connexion, modification, suppression, validation.
        La catégorie « paiement » reste vide tant que le module de paiement réel n'existe pas.
      </p>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={`btn ${filtreType === "" ? "" : "btn-secondary"}`} onClick={() => setFiltreType("")} style={{ fontSize: 12, padding: "6px 12px" }}>
          Tous
        </button>
        {Object.entries(LABELS_TYPE_ACTION).map(([val, label]) => (
          <button
            key={val}
            className={`btn ${filtreType === val ? "" : "btn-secondary"}`}
            onClick={() => setFiltreType(val)}
            style={{ fontSize: 12, padding: "6px 12px" }}
          >
            {label}
          </button>
        ))}
      </div>

      {chargement ? (
        <p>Chargement...</p>
      ) : entrees.length === 0 ? (
        <p style={{ fontSize: 13, color: "#777" }}>Aucune entrée pour ce filtre.</p>
      ) : (
        entrees.map((e) => (
          <div key={e._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <span
                style={{
                  fontSize: 11, fontWeight: 700, color: "#fff", background: COULEURS_TYPE_ACTION[e.typeAction] || "#777",
                  borderRadius: 4, padding: "2px 8px", marginRight: 8,
                }}
              >
                {LABELS_TYPE_ACTION[e.typeAction] || e.typeAction}
              </span>
              <span style={{ fontSize: 13 }}>{e.description}</span>
              {e.utilisateur && (
                <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0" }}>
                  Par {e.utilisateur.nom} ({e.utilisateur.role})
                </p>
              )}
            </div>
            <span style={{ fontSize: 11, color: "#999", whiteSpace: "nowrap" }}>
              {new Date(e.createdAt).toLocaleString()}
            </span>
          </div>
        ))
      )}
    </div>
  );
};

export default JournalAudit;
