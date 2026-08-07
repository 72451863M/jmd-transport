import React, { useEffect, useState } from "react";
import { getDocumentsLivraison, ajouterDocument } from "../api/documentApi";

const LABELS_TYPE = {
  lettre_voiture: "Lettre de voiture",
  bon_livraison: "Bon de livraison",
  facture: "Facture",
  assurance: "Assurance",
  photo: "Photo",
  autre: "Autre",
};

const LettreVoiture = ({ data }) => (
  <div style={{ border: "1px dashed #ccc", padding: 14, borderRadius: 8, fontSize: 13 }} className="lettre-voiture-print">
    <p style={{ fontWeight: 700, marginBottom: 6 }}>Lettre de voiture — Réf. {data.reference?.slice(-8)}</p>
    <p>Expéditeur : {data.expediteur?.nom} ({data.expediteur?.telephone})</p>
    <p>Transporteur : {data.transporteur?.nom} ({data.transporteur?.telephone})
      {data.transporteur?.vehicule?.type && ` — ${data.transporteur.vehicule.type} ${data.transporteur.vehicule.immatriculation || ""}`}
    </p>
    <p>Trajet : {data.trajet?.depart} → {data.trajet?.arrivee} ({data.trajet?.distanceKm} km)</p>
    <p>Marchandise : {data.marchandise?.description || "—"} ({data.marchandise?.poidsKg} kg)</p>
    <p>Prix : {data.prix} FCFA · Paiement : {data.modePaiement}</p>
    <button className="btn" onClick={() => window.print()} style={{ marginTop: 8, fontSize: 12, padding: "6px 12px" }}>
      Imprimer
    </button>
  </div>
);

const DocumentsLivraison = ({ livraisonId }) => {
  const [documents, setDocuments] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [type, setType] = useState("photo");
  const [url, setUrl] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = async () => {
    try {
      const { data } = await getDocumentsLivraison(livraisonId);
      setDocuments(data);
    } catch (err) {
      // silencieux
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, [livraisonId]);

  const handleAjouter = async (e) => {
    e.preventDefault();
    if (!url) return;
    try {
      await ajouterDocument(livraisonId, type, url);
      setUrl("");
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'ajout");
    }
  };

  if (chargement) return <p style={{ fontSize: 13, color: "#777" }}>Chargement des documents...</p>;

  const lettreVoiture = documents.find((d) => d.type === "lettre_voiture");
  const autresDocuments = documents.filter((d) => d.type !== "lettre_voiture");

  return (
    <div style={{ marginTop: 10 }}>
      <h4 style={{ fontSize: 14, marginBottom: 8 }}>Documents</h4>
      {lettreVoiture && <LettreVoiture data={lettreVoiture.donneesGenerees} />}

      {autresDocuments.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {autresDocuments.map((d) => (
            <div key={d._id} style={{ fontSize: 13, marginBottom: 4 }}>
              <a href={d.url} target="_blank" rel="noreferrer">{LABELS_TYPE[d.type] || d.type}</a>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAjouter} style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="photo">Photo</option>
          <option value="bon_livraison">Bon de livraison</option>
          <option value="assurance">Assurance</option>
          <option value="facture">Facture</option>
          <option value="autre">Autre</option>
        </select>
        <input placeholder="URL du document" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" className="btn btn-secondary" style={{ fontSize: 12 }}>Ajouter</button>
      </form>
      {erreur && <p style={{ color: "red", fontSize: 12 }}>{erreur}</p>}
    </div>
  );
};

export default DocumentsLivraison;
