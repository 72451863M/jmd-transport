import React, { useEffect, useState } from "react";
import { getToutesFAQ, ajouterFAQ, modifierFAQ, supprimerFAQ } from "../api/faqApi";

const AdminFAQ = () => {
  const [entrees, setEntrees] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [form, setForm] = useState({ question: "", reponse: "", categorie: "Général", ordre: 0 });

  const charger = async () => {
    try {
      const { data } = await getToutesFAQ();
      setEntrees(data);
    } catch (err) {
      setErreur("Impossible de charger la FAQ");
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
      await ajouterFAQ(form);
      setForm({ question: "", reponse: "", categorie: "Général", ordre: 0 });
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'ajout");
    }
  };

  const handleToggleActif = async (entree) => {
    try {
      await modifierFAQ(entree._id, { actif: !entree.actif });
      charger();
    } catch (err) {
      window.alert(err.response?.data?.message || "Erreur");
    }
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm("Supprimer cette entrée FAQ ?")) return;
    try {
      await supprimerFAQ(id);
      charger();
    } catch (err) {
      window.alert(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  if (chargement) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 700 }}>
      <h2 style={{ marginBottom: 20 }}>Gestion de la FAQ</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      <div className="card">
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Ajouter une entrée</h3>
        <form onSubmit={handleAjouter}>
          <label>Question</label>
          <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required />

          <label>Réponse</label>
          <textarea rows={3} value={form.reponse} onChange={(e) => setForm({ ...form, reponse: e.target.value })} required />

          <label>Catégorie</label>
          <input value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} />

          <label>Ordre d'affichage</label>
          <input type="number" value={form.ordre} onChange={(e) => setForm({ ...form, ordre: Number(e.target.value) })} />

          <button type="submit" className="btn" style={{ marginTop: 10 }}>Ajouter</button>
        </form>
      </div>

      <h3 style={{ margin: "20px 0 10px" }}>Entrées ({entrees.length})</h3>
      {entrees.map((f) => (
        <div key={f._id} className="card" style={{ opacity: f.actif ? 1 : 0.6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <strong>{f.question}</strong>
              <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0" }}>{f.reponse}</p>
              <p style={{ fontSize: 11, color: "#999", margin: "4px 0 0" }}>{f.categorie} — ordre {f.ordre} {!f.actif && "— désactivée"}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={() => handleToggleActif(f)} style={{ fontSize: 12, padding: "6px 10px" }}>
                {f.actif ? "Désactiver" : "Activer"}
              </button>
              <button onClick={() => handleSupprimer(f._id)} style={{ background: "none", border: "1px solid #cc3333", color: "#cc3333", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                Retirer
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminFAQ;
