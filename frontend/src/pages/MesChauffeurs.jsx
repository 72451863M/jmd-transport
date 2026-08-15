import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ajouterChauffeur, getMesChauffeurs, modifierChauffeur, supprimerChauffeur } from "../api/chauffeurApi";

const LABELS_DISPONIBILITE = { disponible: "Disponible", en_mission: "En mission", indisponible: "Indisponible" };
const COULEURS_DISPONIBILITE = { disponible: "#33a852", en_mission: "#cc5500", indisponible: "#cc3333" };

const FORM_VIDE = { nom: "", telephone: "", numeroPermis: "", categoriePermis: "", dateExpirationPermis: "", certificatNom: "" };

const MesChauffeurs = () => {
  const [chauffeurs, setChauffeurs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [form, setForm] = useState(FORM_VIDE);

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
      await ajouterChauffeur({
        nom: form.nom,
        telephone: form.telephone,
        numeroPermis: form.numeroPermis || undefined,
        categoriePermis: form.categoriePermis || undefined,
        dateExpirationPermis: form.dateExpirationPermis || undefined,
        certificats: form.certificatNom ? [{ nom: form.certificatNom }] : [],
      });
      setForm(FORM_VIDE);
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

  const handleChangerDisponibilite = async (chauffeur, disponibilite) => {
    try {
      await modifierChauffeur(chauffeur._id, { disponibilite });
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

          <label>Catégorie de permis (facultatif)</label>
          <select value={form.categoriePermis} onChange={(e) => setForm({ ...form, categoriePermis: e.target.value })}>
            <option value="">-- Non précisée --</option>
            {["A", "B", "C", "D", "E"].map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <label>Date d'expiration du permis (facultatif)</label>
          <input type="date" value={form.dateExpirationPermis} onChange={(e) => setForm({ ...form, dateExpirationPermis: e.target.value })} />

          <label>Certificat (facultatif, ex. transport matières dangereuses)</label>
          <input value={form.certificatNom} onChange={(e) => setForm({ ...form, certificatNom: e.target.value })} />

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
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#fff", background: COULEURS_DISPONIBILITE[c.disponibilite], borderRadius: 4, padding: "2px 6px" }}>
                {LABELS_DISPONIBILITE[c.disponibilite]}
              </span>
              {(c.numeroPermis || c.categoriePermis) && (
                <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0" }}>
                  Permis {c.categoriePermis && `catégorie ${c.categoriePermis}`} {c.numeroPermis && `n° ${c.numeroPermis}`}
                  {c.dateExpirationPermis && ` — expire le ${new Date(c.dateExpirationPermis).toLocaleDateString()}`}
                </p>
              )}
              {c.certificats?.length > 0 && (
                <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0" }}>
                  Certificats : {c.certificats.map((cert) => cert.nom).join(", ")}
                </p>
              )}
              {c.statsMissions && (
                <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0" }}>
                  {c.statsMissions.missionsCompletees} mission(s) complétée(s)
                  {c.statsMissions.nbNotes > 0 && ` — note moyenne ${Math.round((c.statsMissions.sommeNotes / c.statsMissions.nbNotes) * 10) / 10}/5`}
                </p>
              )}
              {!c.actif && <p style={{ fontSize: 12, color: "#cc5500", margin: "4px 0 0" }}>Désactivé</p>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Link to={`/chauffeurs/${c._id}/historique`} className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px", textDecoration: "none" }}>
                Historique
              </Link>
              {c.disponibilite !== "en_mission" && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleChangerDisponibilite(c, c.disponibilite === "indisponible" ? "disponible" : "indisponible")}
                  style={{ fontSize: 12, padding: "6px 10px" }}
                >
                  {c.disponibilite === "indisponible" ? "Marquer disponible" : "Marquer indisponible"}
                </button>
              )}
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
