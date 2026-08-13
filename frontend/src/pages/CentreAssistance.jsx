import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFAQ, rechercherAssistant } from "../api/faqApi";
import { creerTicket, getMesTickets } from "../api/ticketApi";

const LABELS_CATEGORIE = { kyc: "KYC", compte: "Compte", paiement: "Paiement", flotte: "Flotte", technique: "Technique", autre: "Autre" };
const LABELS_STATUT = { ouvert: "Ouvert", en_cours: "En cours", resolu: "Résolu", ferme: "Fermé" };

const CentreAssistance = () => {
  const [faq, setFaq] = useState([]);
  const [mesTickets, setMesTickets] = useState([]);
  const [question, setQuestion] = useState("");
  const [resultats, setResultats] = useState(null);
  const [aRecherche, setARecherche] = useState(false);
  const [formTicket, setFormTicket] = useState({ sujet: "", categorie: "autre", message: "" });
  const [afficherForm, setAfficherForm] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = async () => {
    try {
      const [resFAQ, resTickets] = await Promise.all([getFAQ(), getMesTickets()]);
      setFaq(resFAQ.data);
      setMesTickets(resTickets.data);
    } catch (err) {
      setErreur("Impossible de charger le centre d'assistance");
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const handleRecherche = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setARecherche(true);
    try {
      const { data } = await rechercherAssistant(question);
      setResultats(data);
    } catch (err) {
      setErreur("Impossible d'effectuer la recherche");
    }
  };

  const handleCreerTicket = async (e) => {
    e.preventDefault();
    try {
      await creerTicket(formTicket);
      setFormTicket({ sujet: "", categorie: "autre", message: "" });
      setAfficherForm(false);
      setMessage("Ton ticket a été créé — le support te répondra bientôt.");
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de la création du ticket");
    }
  };

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 700 }}>
      <h2 style={{ marginBottom: 20 }}>Centre d'assistance</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}
      {message && <p style={{ color: "#33a852" }}>{message}</p>}

      <div className="card">
        <h3 style={{ marginBottom: 10, fontSize: 16 }}>Pose ta question</h3>
        <p style={{ fontSize: 12, color: "#999", marginBottom: 10 }}>
          Recherche simple par mots-clés dans la FAQ — pas un assistant conversationnel intelligent, juste un moyen
          rapide de trouver la bonne fiche.
        </p>
        <form onSubmit={handleRecherche} style={{ display: "flex", gap: 8 }}>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex. Comment valider mon KYC ?" style={{ flex: 1 }} />
          <button type="submit" className="btn">Chercher</button>
        </form>

        {aRecherche && resultats && (
          <div style={{ marginTop: 14 }}>
            {resultats.resultats.length > 0 ? (
              resultats.resultats.map((r) => (
                <div key={r._id} style={{ borderTop: "1px solid #eee", paddingTop: 10, marginTop: 10 }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>{r.question}</p>
                  <p style={{ fontSize: 14, color: "#555", margin: "4px 0 0" }}>{r.reponse}</p>
                </div>
              ))
            ) : (
              <div style={{ borderTop: "1px solid #eee", paddingTop: 10, marginTop: 10 }}>
                <p style={{ fontSize: 14, color: "#777" }}>Aucune fiche ne correspond à ta question.</p>
                <button className="btn btn-secondary" onClick={() => { setAfficherForm(true); setFormTicket({ ...formTicket, sujet: question }); }} style={{ fontSize: 13 }}>
                  Créer un ticket d'assistance
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10, fontSize: 16 }}>Toutes les questions fréquentes</h3>
        {faq.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>Aucune entrée disponible pour le moment.</p>}
        {faq.map((f) => (
          <details key={f._id} style={{ marginBottom: 8 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>{f.question}</summary>
            <p style={{ fontSize: 13, color: "#555", margin: "6px 0 0" }}>{f.reponse}</p>
          </details>
        ))}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Besoin d'aide supplémentaire ?</h3>
          {!afficherForm && (
            <button className="btn" onClick={() => setAfficherForm(true)} style={{ fontSize: 13 }}>
              Créer un ticket
            </button>
          )}
        </div>

        {afficherForm && (
          <form onSubmit={handleCreerTicket} style={{ marginTop: 14 }}>
            <label>Sujet</label>
            <input value={formTicket.sujet} onChange={(e) => setFormTicket({ ...formTicket, sujet: e.target.value })} required />

            <label>Catégorie</label>
            <select value={formTicket.categorie} onChange={(e) => setFormTicket({ ...formTicket, categorie: e.target.value })}>
              {Object.entries(LABELS_CATEGORIE).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>

            <label>Ton message</label>
            <textarea rows={3} value={formTicket.message} onChange={(e) => setFormTicket({ ...formTicket, message: e.target.value })} required />

            <button type="submit" className="btn" style={{ marginTop: 10 }}>Envoyer</button>
          </form>
        )}
      </div>

      <h3 style={{ margin: "20px 0 10px" }}>Mes tickets ({mesTickets.length})</h3>
      {mesTickets.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>Aucun ticket pour le moment.</p>}
      {mesTickets.map((t) => (
        <Link key={t._id} to={`/assistance/tickets/${t._id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{t.sujet}</strong>
              <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0" }}>{LABELS_CATEGORIE[t.categorie]} — {t.messages.length} message(s)</p>
            </div>
            <span className={`badge ${t.statut}`}>{LABELS_STATUT[t.statut]}</span>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default CentreAssistance;
