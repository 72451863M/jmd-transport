import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ajouterMaintenance, getHistoriqueMaintenance } from "../api/maintenanceApi";
import { modifierVehicule } from "../api/vehiculeApi";

const LABELS_TYPE = { entretien: "Entretien", vidange: "Vidange", pneus: "Pneus", reparation: "Réparation" };

const FORM_VIDE = { type: "entretien", description: "", dateRealisee: "", kilometrageAuMoment: "", cout: "" };

const MaintenanceVehicule = () => {
  const { id } = useParams();
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(FORM_VIDE);
  const [formEcheances, setFormEcheances] = useState({ dateProchainControleTechnique: "", dateExpirationAssurance: "", kilometrageActuel: "" });

  const charger = async () => {
    try {
      const { data } = await getHistoriqueMaintenance(id);
      setDonnees(data);
      setFormEcheances({
        dateProchainControleTechnique: data.vehicule.dateProchainControleTechnique ? data.vehicule.dateProchainControleTechnique.slice(0, 10) : "",
        dateExpirationAssurance: data.vehicule.dateExpirationAssurance ? data.vehicule.dateExpirationAssurance.slice(0, 10) : "",
        kilometrageActuel: data.vehicule.kilometrageActuel || "",
      });
    } catch (err) {
      setErreur(err.response?.data?.message || "Impossible de charger la maintenance");
    }
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAjouter = async (e) => {
    e.preventDefault();
    try {
      await ajouterMaintenance({
        vehiculeId: id,
        type: form.type,
        description: form.description,
        dateRealisee: form.dateRealisee,
        kilometrageAuMoment: form.kilometrageAuMoment ? Number(form.kilometrageAuMoment) : undefined,
        cout: form.cout ? Number(form.cout) : undefined,
      });
      setForm(FORM_VIDE);
      setMessage("Intervention enregistrée.");
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleEnregistrerEcheances = async (e) => {
    e.preventDefault();
    try {
      await modifierVehicule(id, {
        dateProchainControleTechnique: formEcheances.dateProchainControleTechnique || null,
        dateExpirationAssurance: formEcheances.dateExpirationAssurance || null,
        kilometrageActuel: formEcheances.kilometrageActuel ? Number(formEcheances.kilometrageActuel) : undefined,
      });
      setMessage("Échéances mises à jour.");
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de la mise à jour");
    }
  };

  if (erreur && !donnees) return <div className="container" style={{ paddingTop: 30 }}><p style={{ color: "red" }}>{erreur}</p></div>;
  if (!donnees) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 700 }}>
      <h2 style={{ marginBottom: 6 }}>Maintenance — {donnees.vehicule.immatriculation}</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}
      {message && <p style={{ color: "#33a852" }}>{message}</p>}

      <div className="card">
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Échéances réglementaires et kilométrage</h3>
        <form onSubmit={handleEnregistrerEcheances}>
          <label>Prochain contrôle technique</label>
          <input type="date" value={formEcheances.dateProchainControleTechnique} onChange={(e) => setFormEcheances({ ...formEcheances, dateProchainControleTechnique: e.target.value })} />

          <label>Expiration de l'assurance</label>
          <input type="date" value={formEcheances.dateExpirationAssurance} onChange={(e) => setFormEcheances({ ...formEcheances, dateExpirationAssurance: e.target.value })} />

          <label>Kilométrage actuel</label>
          <input type="number" min="0" value={formEcheances.kilometrageActuel} onChange={(e) => setFormEcheances({ ...formEcheances, kilometrageActuel: e.target.value })} />

          <button type="submit" className="btn btn-secondary" style={{ marginTop: 10 }}>Mettre à jour</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Enregistrer une intervention</h3>
        <form onSubmit={handleAjouter}>
          <label>Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(LABELS_TYPE).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>

          <label>Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />

          <label>Date de l'intervention</label>
          <input type="date" value={form.dateRealisee} onChange={(e) => setForm({ ...form, dateRealisee: e.target.value })} required />

          <label>Kilométrage au moment de l'intervention (facultatif)</label>
          <input type="number" min="0" value={form.kilometrageAuMoment} onChange={(e) => setForm({ ...form, kilometrageAuMoment: e.target.value })} />

          <label>Coût en FCFA (facultatif)</label>
          <input type="number" min="0" value={form.cout} onChange={(e) => setForm({ ...form, cout: e.target.value })} />

          <button type="submit" className="btn" style={{ marginTop: 10 }}>Enregistrer</button>
        </form>
      </div>

      <h3 style={{ margin: "20px 0 10px" }}>Historique ({donnees.interventions.length})</h3>
      {donnees.interventions.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>Aucune intervention enregistrée.</p>}
      {donnees.interventions.map((i) => (
        <div key={i._id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <strong>{LABELS_TYPE[i.type]}</strong> — {i.description}
              <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0" }}>
                {new Date(i.dateRealisee).toLocaleDateString()}
                {i.kilometrageAuMoment && ` — ${i.kilometrageAuMoment.toLocaleString()} km`}
                {i.cout && ` — ${i.cout.toLocaleString()} FCFA`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MaintenanceVehicule;
