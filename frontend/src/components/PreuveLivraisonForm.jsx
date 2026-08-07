import React, { useState } from "react";
import { livrerAvecPreuve } from "../api/livraisonApi";

const PreuveLivraisonForm = ({ livraisonId, onLivree }) => {
  const [ouvert, setOuvert] = useState(false);
  const [nomDestinataire, setNomDestinataire] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  if (!ouvert) {
    return (
      <button className="btn" onClick={() => setOuvert(true)}>
        Marquer comme livrée
      </button>
    );
  }

  const handleConfirmer = async () => {
    if (!nomDestinataire || (!photoUrl && !signatureUrl)) {
      setErreur("Le nom du destinataire et au moins une preuve (photo ou signature) sont obligatoires.");
      return;
    }
    setEnvoi(true);
    try {
      await livrerAvecPreuve(livraisonId, { nomDestinataire, photoUrl, signatureUrl });
      setErreur("");
      onLivree && onLivree();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de la confirmation de livraison");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div style={{ marginTop: 8, padding: 10, background: "#fff7ed", borderRadius: 8, border: "1px solid #ffd9a8" }}>
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Confirmer la livraison (signature électronique)</p>
      <input
        placeholder="Nom du destinataire"
        value={nomDestinataire}
        onChange={(e) => setNomDestinataire(e.target.value)}
        style={{ width: "100%", marginBottom: 6 }}
      />
      <input
        placeholder="URL photo de la remise (facultatif si signature)"
        value={photoUrl}
        onChange={(e) => setPhotoUrl(e.target.value)}
        style={{ width: "100%", marginBottom: 6 }}
      />
      <input
        placeholder="URL signature électronique (facultatif si photo)"
        value={signatureUrl}
        onChange={(e) => setSignatureUrl(e.target.value)}
        style={{ width: "100%", marginBottom: 6 }}
      />
      {erreur && <p style={{ color: "red", fontSize: 12 }}>{erreur}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={handleConfirmer} disabled={envoi} style={{ fontSize: 13, padding: "6px 12px" }}>
          {envoi ? "Envoi..." : "Confirmer la livraison"}
        </button>
        <button
          onClick={() => setOuvert(false)}
          style={{ background: "none", border: "none", color: "#777", cursor: "pointer", fontSize: 13 }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
};

export default PreuveLivraisonForm;
