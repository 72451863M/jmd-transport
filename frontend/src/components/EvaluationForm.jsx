import React, { useState } from "react";
import { evaluerLivraison } from "../api/livraisonApi";

const EvaluationForm = ({ livraisonId, evaluationExistante, onEvalue }) => {
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  if (evaluationExistante && evaluationExistante.note) {
    return (
      <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
        Ton évaluation : {"★".repeat(evaluationExistante.note)}{"☆".repeat(5 - evaluationExistante.note)}
        {evaluationExistante.commentaire ? ` — "${evaluationExistante.commentaire}"` : ""}
      </p>
    );
  }

  const handleEnvoyer = async () => {
    if (!note) {
      setErreur("Choisis une note avant d'envoyer.");
      return;
    }
    setEnvoi(true);
    try {
      await evaluerLivraison(livraisonId, note, commentaire);
      setErreur("");
      onEvalue && onEvalue();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'envoi de l'évaluation");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div style={{ marginTop: 10, padding: 10, background: "#f4f6f8", borderRadius: 8 }}>
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Évaluer cette livraison</p>
      <div style={{ fontSize: 22, cursor: "pointer", marginBottom: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} onClick={() => setNote(n)} style={{ color: n <= note ? "var(--cargo-orange)" : "var(--line-200)" }}>
            ★
          </span>
        ))}
      </div>
      <input
        placeholder="Commentaire (facultatif)"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        style={{ width: "100%", marginBottom: 6 }}
      />
      {erreur && <p style={{ color: "red", fontSize: 12 }}>{erreur}</p>}
      <button className="btn" onClick={handleEnvoyer} disabled={envoi} style={{ fontSize: 13, padding: "6px 12px" }}>
        {envoi ? "Envoi..." : "Envoyer l'évaluation"}
      </button>
    </div>
  );
};

export default EvaluationForm;
