import React, { useEffect, useState } from "react";
import { ajouterChauffeur, getMesChauffeurs, modifierChauffeur, supprimerChauffeur } from "../api/chauffeurApi";

const MesChauffeurs = () => {
  const [chauffeurs, setChauffeurs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [form, setForm] = useState({ nom: "", telephone: "", numeroPermis: "" });

  const charger = async () => {
    try {
      const { data } = await getMesChauffeurs();
      setChauffeurs(data);
    } catch (err) {
      setErreur("Impossible de charger l'équipe");
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
      await ajouterChauffeur(form);
      setForm({ nom: "", telephone: "", numeroPermis: "" });
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'ajout");
    }
  };

  const handleToggleActif = async (chauffeur) => {
    try {
      await modifierChauffeur(chauffeur._id, { actif: !chauffeur.actif });
      charger();
    } catch (err) {
      window.alert(err.response?.data?.message || "Erreur");
    }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm("Retirer ce chauffeur de ton équipe ?")) return;
    try {
      await supprimerChauffeur(id);
      charger();
    } catch (err) {
      window.alert(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  if (chargement) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 650 }}>
      <h2 style={{ marginBottom: 20 }}>Mes chauffeurs</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      <div className="card">
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Ajouter un chauffeur</h3>
        <form onSubmit={handleAjouter}>
          <label>Nom complet</label>
          <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />

          <label>Téléphone</label>
          <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} required />

          <label>Numéro de permis (facultatif)</label>
          <input value={form.numeroPermis} onChange={(e) => setForm({ ...form, numeroPermis: e.target.value })} />

          <button type="submit" className="btn" style={{ marginTop: 10 }}>Ajouter à mon équipe</button>
        </form>
      </div>

      <h3 style={{ margin: "20px 0 10px" }}>Équipe ({chauffeurs.length})</h3>
      {chauffeurs.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>Aucun chauffeur enregistré pour le moment.</p>}
      {chauffeurs.map((c) => (
        <div key={c._id} className="card" style={{ opacity: c.actif ? 1 : 0.6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <strong>{c.nom}</strong> — {c.telephone}
              {c.numeroPermis && <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0" }}>Permis n° {c.numeroPermis}</p>}
              {!c.actif && <p style={{ fontSize: 12, color: "#cc5500", margin: "4px 0 0" }}>Désactivé</p>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => handleToggleActif(c)} style={{ fontSize: 12, padding: "6px 10px" }}>
                {c.actif ? "Désactiver" : "Activer"}
              </button>
              <button onClick={() => handleSupprimer(c._id)} style={{ background: "none", border: "1px solid #cc3333", color: "#cc3333", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                Retirer
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MesChauffeurs;
