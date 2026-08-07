import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { creerLivraison, getLivraisons, estimerPrix, updateStatutLivraison } from "../api/livraisonApi";
import EvaluationForm from "../components/EvaluationForm";
import ReclamationForm from "../components/ReclamationForm";

const ClientDashboard = () => {
  const [livraisons, setLivraisons] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [afficherForm, setAfficherForm] = useState(false);
  const [estimation, setEstimation] = useState(null);
  const [estimationChargement, setEstimationChargement] = useState(false);

  const [form, setForm] = useState({
    departLabel: "",
    departPays: "Mali",
    arriveeLabel: "",
    arriveePays: "Mali",
    description: "",
    poidsKg: "",
    distanceKm: "",
    optionExpress: false,
    modePaiement: "especes",
  });

  const PAYS_UEMOA = ["Mali", "Sénégal", "Côte d'Ivoire", "Burkina Faso", "Togo", "Bénin", "Niger", "Guinée-Bissau"];

  const chargerLivraisons = async () => {
    try {
      const { data } = await getLivraisons();
      setLivraisons(data);
    } catch (err) {
      setErreur("Impossible de charger vos livraisons");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerLivraisons();
  }, []);

  // Recalcule l'estimation de prix (Module Tarification V1) à chaque
  // changement de distance/poids/express, avec un léger anti-rebond.
  useEffect(() => {
    if (!form.distanceKm && !form.poidsKg) {
      setEstimation(null);
      return;
    }
    const minuteur = setTimeout(async () => {
      setEstimationChargement(true);
      try {
        const { data } = await estimerPrix({
          distanceKm: Number(form.distanceKm) || 0,
          poidsKg: Number(form.poidsKg) || 0,
          optionExpress: form.optionExpress,
        });
        setEstimation(data);
      } catch (err) {
        setEstimation(null);
      } finally {
        setEstimationChargement(false);
      }
    }, 400);
    return () => clearTimeout(minuteur);
  }, [form.distanceKm, form.poidsKg, form.optionExpress]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await creerLivraison({
        adresseDepart: { label: form.departLabel, pays: form.departPays },
        adresseArrivee: { label: form.arriveeLabel, pays: form.arriveePays },
        description: form.description,
        poidsKg: Number(form.poidsKg) || 0,
        distanceKm: Number(form.distanceKm) || 0,
        optionExpress: form.optionExpress,
        modePaiement: form.modePaiement,
      });
      setForm({
        departLabel: "",
        departPays: "Mali",
        arriveeLabel: "",
        arriveePays: "Mali",
        description: "",
        poidsKg: "",
        distanceKm: "",
        optionExpress: false,
        modePaiement: "especes",
      });
      setEstimation(null);
      setAfficherForm(false);
      chargerLivraisons();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de la création");
    }
  };

  const handleAnnuler = async (id) => {
    const motif = window.prompt("Motif de l'annulation (facultatif) :") || "";
    try {
      await updateStatutLivraison(id, "annulee", motif);
      chargerLivraisons();
    } catch (err) {
      setErreur(err.response?.data?.message || "Annulation impossible");
    }
  };

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>Mes livraisons</h2>
        <button className="btn" onClick={() => setAfficherForm(!afficherForm)}>
          {afficherForm ? "Annuler" : "+ Nouvelle livraison"}
        </button>
      </div>

      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      {afficherForm && (
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Créer une demande de livraison</h3>
          <form onSubmit={handleSubmit}>
            <label>Adresse de départ</label>
            <input name="departLabel" value={form.departLabel} onChange={handleChange} required />
            <select name="departPays" value={form.departPays} onChange={handleChange}>
              {PAYS_UEMOA.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <label>Adresse d'arrivée</label>
            <input name="arriveeLabel" value={form.arriveeLabel} onChange={handleChange} required />
            <select name="arriveePays" value={form.arriveePays} onChange={handleChange}>
              {PAYS_UEMOA.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            {form.departPays !== form.arriveePays && (
              <p style={{ fontSize: 12, color: "#cc5500", background: "#fff7ed", padding: 8, borderRadius: 6, margin: "8px 0" }}>
                ⚠ Trajet transfrontalier ({form.departPays} → {form.arriveePays}). Les formalités douanières ne sont pas encore automatisées ; un agent te contactera pour les organiser.
              </p>
            )}

            <label>Description du colis</label>
            <textarea name="description" rows={2} value={form.description} onChange={handleChange} />

            <label>Distance estimée (km)</label>
            <input type="number" name="distanceKm" value={form.distanceKm} onChange={handleChange} required />

            <label>Poids (kg)</label>
            <input type="number" name="poidsKg" value={form.poidsKg} onChange={handleChange} />

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input type="checkbox" name="optionExpress" checked={form.optionExpress} onChange={handleChange} style={{ width: "auto" }} />
              Livraison express (+25%)
            </label>

            <label>Mode de paiement</label>
            <select name="modePaiement" value={form.modePaiement} onChange={handleChange}>
              <option value="especes">Espèces</option>
              <option value="orange_money">Orange Money</option>
              <option value="moov_money">Moov Money</option>
              <option value="wave">Wave</option>
            </select>

            <div className="estimation-prix" style={{ margin: "14px 0", padding: 12, background: "#f4f6f8", borderRadius: 8 }}>
              {estimationChargement && <p style={{ margin: 0, fontSize: 14 }}>Calcul du prix...</p>}
              {!estimationChargement && estimation && (
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  Prix estimé : {estimation.prix.toLocaleString()} FCFA
                  {estimation.details?.majorationNuit && (
                    <span style={{ fontWeight: 400, fontSize: 13, color: "#555" }}> (majoration nuit incluse)</span>
                  )}
                </p>
              )}
              {!estimationChargement && !estimation && (
                <p style={{ margin: 0, fontSize: 13, color: "#777" }}>Renseigne la distance et le poids pour voir le prix estimé.</p>
              )}
            </div>

            <button type="submit" className="btn">Créer la livraison</button>
          </form>
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
              <strong>
                {l.adresseDepart.label} → {l.adresseArrivee.label}
                {l.estTransfrontalier && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#cc5500", border: "1px solid #cc5500", borderRadius: 4, padding: "1px 6px" }}>
                    TRANSFRONTALIER
                  </span>
                )}
              </strong>
              <span className={`badge ${l.statut}`}>{l.statut.replace("_", " ")}</span>
            </div>
            <p style={{ fontSize: 14, color: "#555", marginTop: 6 }}>
              Prix : {l.prix} FCFA · Paiement : {l.modePaiement.replace("_", " ")}
            </p>
            {l.transporteur && (
              <p style={{ fontSize: 14, marginTop: 4 }}>
                Transporteur : {l.transporteur.nom} ({l.transporteur.telephone})
              </p>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 8, alignItems: "center" }}>
              <Link to={`/tracking/${l._id}`} style={{ color: "#ff6600", fontSize: 14 }}>
                Suivre en temps réel →
              </Link>
              {!["livree", "annulee"].includes(l.statut) && (
                <button
                  onClick={() => handleAnnuler(l._id)}
                  style={{ background: "none", border: "none", color: "#cc3333", fontSize: 14, cursor: "pointer", padding: 0 }}
                  disabled={l.statut === "en_cours"}
                  title={l.statut === "en_cours" ? "Annulation bloquée : livraison déjà en cours" : ""}
                >
                  Annuler
                </button>
              )}
            </div>
            {l.statut === "livree" && (
              <EvaluationForm
                livraisonId={l._id}
                evaluationExistante={l.evaluation?.clientVersTransporteur}
                onEvalue={chargerLivraisons}
              />
            )}
            {["livree", "annulee", "en_cours"].includes(l.statut) && (
              <ReclamationForm livraisonId={l._id} />
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ClientDashboard;
