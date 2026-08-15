import React, { useEffect, useState } from "react";
import { creerEntreprise, getMonEntreprise, ajouterCollaborateur } from "../api/entrepriseApi";
import { useAuth } from "../context/AuthContext";

const Entreprise = () => {
  const { user, mettreAJourUser } = useAuth();
  const [entreprise, setEntreprise] = useState(null);
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({ raisonSociale: "", rccm: "", nif: "", adresse: "", telephone: "" });
  const [emailInvite, setEmailInvite] = useState("");

  const charger = async () => {
    try {
      const { data } = await getMonEntreprise();
      setEntreprise(data.entreprise);
      setCollaborateurs(data.collaborateurs);
    } catch (err) {
      setEntreprise(null);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const handleCreer = async (e) => {
    e.preventDefault();
    try {
      const { data } = await creerEntreprise(form);
      mettreAJourUser({ entreprise: { entrepriseId: data._id, roleEntreprise: "proprietaire" } });
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de la création");
    }
  };

  const handleInviter = async (e) => {
    e.preventDefault();
    try {
      await ajouterCollaborateur(emailInvite);
      setMessage("Collaborateur ajouté.");
      setErreur("");
      setEmailInvite("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'invitation");
    }
  };

  if (chargement) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

  if (user?.role !== "client" && user?.role !== "transporteur") {
    return (
      <div className="container" style={{ paddingTop: 30 }}>
        <p>Cette section est réservée aux comptes client et transporteur.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 600 }}>
      <h2 style={{ marginBottom: 20 }}>Mon entreprise</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}
      {message && <p style={{ color: "#33a852" }}>{message}</p>}

      {!entreprise ? (
        <div className="card">
          <p style={{ marginBottom: 12 }}>Tu n'es affilié à aucune entreprise. Crée-en une pour bénéficier d'un compte multi-utilisateurs.</p>
          <form onSubmit={handleCreer}>
            <label>Raison sociale</label>
            <input value={form.raisonSociale} onChange={(e) => setForm({ ...form, raisonSociale: e.target.value })} required />
            <label>RCCM</label>
            <input value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} />
            <label>NIF</label>
            <input value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} />
            <label>Adresse</label>
            <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            <label>Téléphone</label>
            <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            <button type="submit" className="btn" style={{ marginTop: 10 }}>Créer l'entreprise</button>
          </form>
        </div>
      ) : (
        <>
          <div className="card">
            <h3>{entreprise.raisonSociale}</h3>
            <p style={{ fontSize: 14, color: "#555" }}>RCCM : {entreprise.rccm || "—"} · NIF : {entreprise.nif || "—"}</p>
          </div>

          <h3 style={{ margin: "20px 0 10px" }}>Membres</h3>
          {collaborateurs.map((c) => (
            <div key={c._id} className="card">
              <strong>{c.nom}</strong> — {c.email} — <em>{c.entreprise?.roleEntreprise}</em>
            </div>
          ))}

          {String(entreprise.proprietaire) === String(user._id) && (
            <div className="card">
              <h3 style={{ marginBottom: 10, fontSize: 16 }}>Ajouter un collaborateur</h3>
              <form onSubmit={handleInviter} style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder={`Email d'un compte ${user.role} existant`}
                  value={emailInvite}
                  onChange={(e) => setEmailInvite(e.target.value)}
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="btn">Ajouter</button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Entreprise;
