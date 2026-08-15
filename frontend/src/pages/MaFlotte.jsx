import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ajouterVehicule, getMesVehicules, modifierVehicule, supprimerVehicule } from "../api/vehiculeApi";
import { getEcheancesProches } from "../api/maintenanceApi";

const LABELS_TYPE = {
  moto: "Moto",
  camionnette: "Camionnette",
  camion: "Camion",
  semi_remorque: "Semi-remorque",
  citerne: "Citerne",
  frigorifique: "Frigorifique",
};

const LABELS_ECHEANCE = { controle_technique: "Contrôle technique", assurance: "Assurance" };

const MaFlotte = () => {
  const [vehicules, setVehicules] = useState([]);
  const [echeances, setEcheances] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [form, setForm] = useState({ immatriculation: "", type: "camionnette", capaciteKg: "", nomChauffeur: "", telephoneChauffeur: "" });

  const charger = async () => {
    try {
      const [resVehicules, resEcheances] = await Promise.all([getMesVehicules(), getEcheancesProches()]);
      setVehicules(resVehicules.data);
      setEcheances(resEcheances.data.echeances);
    } catch (err) {
      setErreur("Impossible de charger la flotte");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const handleAjouter = async (e) => {
    e.preventDefault();
    try {
      await ajouterVehicule({ ...form, capaciteKg: Number(form.capaciteKg) });
      setForm({ immatriculation: "", type: "camionnette", capaciteKg: "", nomChauffeur: "", telephoneChauffeur: "" });
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'ajout");
    }
  };

  const handleToggleActif = async (vehicule) => {
    try {
      await modifierVehicule(vehicule._id, { actif: !vehicule.actif });
      charger();
    } catch (err) {
      window.alert(err.response?.data?.message || "Erreur");
    }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm("Retirer ce véhicule de ta flotte ?")) return;
    try {
      await supprimerVehicule(id);
      charger();
    } catch (err) {
      window.alert(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  if (chargement) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 650 }}>
      <h2 style={{ marginBottom: 20 }}>Ma flotte</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      {echeances.length > 0 && (
        <div className="card" style={{ background: "#fff3e0", border: "1px solid #cc5500" }}>
          <h3 style={{ marginBottom: 8, fontSize: 15, color: "#cc5500" }}>⚠ Échéances à surveiller</h3>
          {echeances.map((e, i) => (
            <p key={i} style={{ fontSize: 13, margin: "4px 0", color: e.depassee ? "#cc3333" : "#555" }}>
              <strong>{e.immatriculation}</strong> — {LABELS_ECHEANCE[e.type]} {e.depassee ? "dépassé le" : "prévu le"} {new Date(e.date).toLocaleDateString()}
              {e.depassee && " — À régulariser rapidement"}
            </p>
          ))}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Ajouter un véhicule</h3>
        <form onSubmit={handleAjouter}>
          <label>Immatriculation</label>
          <input value={form.immatriculation} onChange={(e) => setForm({ ...form, immatriculation: e.target.value })} required />

          <label>Type de véhicule</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(LABELS_TYPE).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>

          <label>Capacité (kg)</label>
          <input type="number" min="1" value={form.capaciteKg} onChange={(e) => setForm({ ...form, capaciteKg: e.target.value })} required />

          <label>Nom du chauffeur (facultatif)</label>
          <input value={form.nomChauffeur} onChange={(e) => setForm({ ...form, nomChauffeur: e.target.value })} />

          <label>Téléphone du chauffeur (facultatif)</label>
          <input value={form.telephoneChauffeur} onChange={(e) => setForm({ ...form, telephoneChauffeur: e.target.value })} />

          <button type="submit" className="btn" style={{ marginTop: 10 }}>Ajouter à ma flotte</button>
        </form>
      </div>

      <h3 style={{ margin: "20px 0 10px" }}>Véhicules ({vehicules.length})</h3>
      {vehicules.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>Aucun véhicule enregistré pour le moment.</p>}
      {vehicules.map((v) => (
        <div key={v._id} className="card" style={{ opacity: v.actif ? 1 : 0.6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <strong>{v.immatriculation}</strong> — {LABELS_TYPE[v.type]} — {v.capaciteKg} kg
              {v.kilometrageActuel != null && <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0" }}>{v.kilometrageActuel.toLocaleString()} km</p>}
              {v.nomChauffeur && <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0" }}>Chauffeur : {v.nomChauffeur} {v.telephoneChauffeur && `(${v.telephoneChauffeur})`}</p>}
              {!v.actif && <p style={{ fontSize: 12, color: "#cc5500", margin: "4px 0 0" }}>Désactivé</p>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Link to={`/flotte/${v._id}/maintenance`} className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px", textDecoration: "none" }}>
                Maintenance
              </Link>
              <button className="btn btn-secondary" onClick={() => handleToggleActif(v)} style={{ fontSize: 12, padding: "6px 10px" }}>
                {v.actif ? "Désactiver" : "Activer"}
              </button>
              <button onClick={() => handleSupprimer(v._id)} style={{ background: "none", border: "1px solid #cc3333", color: "#cc3333", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                Retirer
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MaFlotte;
