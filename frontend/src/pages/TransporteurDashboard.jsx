import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getLivraisons,
  accepterLivraison,
  updateStatutLivraison,
  getTransporteurs,
} from "../api/livraisonApi";
import { useAuth } from "../context/AuthContext";
import EvaluationForm from "../components/EvaluationForm";
import PreuveLivraisonForm from "../components/PreuveLivraisonForm";
import { getMesVehicules } from "../api/vehiculeApi";

const TransporteurDashboard = () => {
  const { user } = useAuth();
  const [livraisons, setLivraisons] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [monProfil, setMonProfil] = useState(null);
  const [mesVehicules, setMesVehicules] = useState([]);
  const [vehiculeSelectionne, setVehiculeSelectionne] = useState("");

  const charger = async () => {
    try {
      const { data } = await getLivraisons();
      setLivraisons(data);
    } catch (err) {
      setErreur("Impossible de charger les livraisons");
    } finally {
      setChargement(false);
    }
  };

  const chargerMesVehicules = async () => {
    try {
      const { data } = await getMesVehicules();
      setMesVehicules(data.filter((v) => v.actif));
    } catch (err) {
      // silencieux : facultatif, un transporteur peut ne pas avoir de flotte
    }
  };

  const chargerMonScore = async () => {
    try {
      const { data } = await getTransporteurs();
      const moi = data.find((t) => t._id === user?._id);
      setMonProfil(moi || null);
    } catch (err) {
      // silencieux : l'affichage du score n'est pas bloquant
    }
  };

  useEffect(() => {
    charger();
    chargerMonScore();
    chargerMesVehicules();
  }, []);

  const handleAccepter = async (id) => {
    try {
      await accepterLivraison(id, vehiculeSelectionne || undefined);
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur");
    }
  };

  const handleChangerStatut = async (id, statut) => {
    try {
      await updateStatutLivraison(id, statut);
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur");
    }
  };

  const handleAnnuler = async (id) => {
    const motif = window.prompt(
      "Motif de l'annulation (une pénalité sera appliquée à ton score de fiabilité) :"
    ) || "";
    try {
      await updateStatutLivraison(id, "annulee", motif);
      charger();
      chargerMonScore();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur");
    }
  };

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Livraisons disponibles / en cours</h2>
        {monProfil && (
          <div style={{ fontSize: 14, background: "#f4f6f8", padding: "8px 14px", borderRadius: 8 }}>
            {monProfil.scoreIA !== null && monProfil.scoreIA !== undefined ? (
              <span>Score de fiabilité : <strong>{monProfil.scoreIA} / 100</strong></span>
            ) : (
              <span style={{ color: "#777" }}>Score de fiabilité pas encore calculé (historique insuffisant)</span>
            )}
          </div>
        )}
      </div>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      {mesVehicules.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Véhicule utilisé pour accepter une mission (facultatif)</label>
          <select value={vehiculeSelectionne} onChange={(e) => setVehiculeSelectionne(e.target.value)} style={{ width: "100%", marginTop: 4 }}>
            <option value="">Aucun véhicule choisi (indépendant)</option>
            {mesVehicules.map((v) => (
              <option key={v._id} value={v._id}>{v.immatriculation} — {v.type} ({v.capaciteKg} kg){v.nomChauffeur ? ` — ${v.nomChauffeur}` : ""}</option>
            ))}
          </select>
        </div>
      )}

      {chargement ? (
        <p>Chargement...</p>
      ) : livraisons.length === 0 ? (
        <p>Aucune livraison pour le moment.</p>
      ) : (
        livraisons.map((l) => (
          <div key={l._id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{l.adresseDepart.label} → {l.adresseArrivee.label}</strong>
              <span className={`badge ${l.statut}`}>{l.statut.replace("_", " ")}</span>
            </div>
            <p style={{ fontSize: 14, color: "#555", marginTop: 6 }}>
              Prix : {l.prix} FCFA · Poids : {l.poidsKg || 0} kg
              {l.retardDetecte && <span style={{ color: "#cc3333", marginLeft: 8 }}>⚠ Retard détecté</span>}
            </p>
            <p style={{ fontSize: 14 }}>
              Client : {l.client?.nom}
              {l.client?.telephone
                ? ` (${l.client.telephone})`
                : " — coordonnées visibles après acceptation"}
            </p>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {l.statut === "en_attente" && (
                <button className="btn" onClick={() => handleAccepter(l._id)}>
                  Accepter cette livraison
                </button>
              )}
              {l.statut === "acceptee" && (
                <>
                  <button className="btn btn-secondary" onClick={() => handleChangerStatut(l._id, "en_cours")}>
                    Démarrer la livraison
                  </button>
                  <button onClick={() => handleAnnuler(l._id)} style={{ background: "none", border: "none", color: "#cc3333", cursor: "pointer" }}>
                    Annuler
                  </button>
                </>
              )}
              {l.statut === "en_cours" && (
                <>
                  <PreuveLivraisonForm livraisonId={l._id} onLivree={() => { charger(); chargerMonScore(); }} />
                  <Link to={`/tracking/${l._id}`} className="btn btn-secondary">
                    Envoyer ma position
                  </Link>
                  <button onClick={() => handleAnnuler(l._id)} style={{ background: "none", border: "none", color: "#cc3333", cursor: "pointer" }}>
                    Annuler (urgence)
                  </button>
                </>
              )}
            </div>
            {l.statut === "livree" && (
              <EvaluationForm
                livraisonId={l._id}
                evaluationExistante={l.evaluation?.transporteurVersClient}
                onEvalue={charger}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default TransporteurDashboard;
