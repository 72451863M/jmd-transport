import React, { useState } from "react";
import { creerReclamation } from "../api/reclamationApi";

const MOTIFS = [
  { value: "retard", label: "Retard" },
  { value: "marchandise_endommagee", label: "Marchandise endommagée" },
  { value: "marchandise_manquante", label: "Marchandise manquante" },
  { value: "comportement", label: "Comportement" },
  { value: "paiement", label: "Problème de paiement" },
  { value: "autre", label: "Autre" },
];

const ReclamationForm = ({ livraisonId }) => {
  const [ouvert, setOuvert] = useState(false);
  const [envoyee, setEnvoyee] = useState(false);
  const [motif, setMotif] = useState("retard");
  const [description, setDescription] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  if (envoyee) {
    return <p style={{ fontSize: 13, color: "#33a852", marginTop: 6 }}>Réclamation envoyée, tu recevras une réponse.</p>;
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        style={{ background: "none", border: "none", color: "#cc3333", fontSize: 13, cursor: "pointer", padding: 0, marginTop: 6 }}
      >
        Signaler un problème
      </button>
    );
  }

  const handleEnvoyer = async () => {
    if (!description.trim()) {
      setErreur("Merci de décrire le problème.");
      return;
    }
    setEnvoi(true);
    try {
      await creerReclamation(livraisonId, motif, description);
      setEnvoyee(true);
      setErreur("");
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div style={{ marginTop: 8, padding: 10, background: "#fff5f5", borderRadius: 8, border: "1px solid #f3c6c6" }}>
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Signaler un problème</p>
      <select value={motif} onChange={(e) => setMotif(e.target.value)} style={{ width: "100%", marginBottom: 6 }}>
        {MOTIFS.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <textarea
        placeholder="Décris le problème"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        style={{ width: "100%", marginBottom: 6 }}
      />
      {erreur && <p style={{ color: "red", fontSize: 12 }}>{erreur}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={handleEnvoyer} disabled={envoi} style={{ fontSize: 13, padding: "6px 12px" }}>
          {envoi ? "Envoi..." : "Envoyer"}
        </button>
        <button onClick={() => setOuvert(false)} style={{ background: "none", border: "none", color: "#777", cursor: "pointer", fontSize: 13 }}>
          Annuler
        </button>
      </div>
    </div>
  );
};

export default ReclamationForm;
