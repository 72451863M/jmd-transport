import React, { useEffect, useState } from "react";
import { getParametres, modifierParametres, getCorridors, modifierTaxeCorridor } from "../api/parametreApi";

const LABELS_ROLES = {
  client: "Peut créer des demandes de livraison, suivre ses colis, évaluer, réclamer, gérer une entreprise.",
  transporteur: "Peut accepter des missions (une fois son KYC validé), gérer sa flotte et ses chauffeurs, consulter ses performances.",
  admin: "Valide les dossiers KYC, gère les utilisateurs, répond aux réclamations, configure les paramètres système.",
};

const ParametresSysteme = () => {
  const [parametres, setParametres] = useState(null);
  const [corridors, setCorridors] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [formTaux, setFormTaux] = useState("");
  const [formPays, setFormPays] = useState("");
  const [formDevise, setFormDevise] = useState("");
  const [tauxTaxeParCorridor, setTauxTaxeParCorridor] = useState({});
  const [noteParCorridor, setNoteParCorridor] = useState({});

  const charger = async () => {
    try {
      const [resParams, resCorridors] = await Promise.all([getParametres(), getCorridors()]);
      setParametres(resParams.data);
      setFormTaux(String(resParams.data.tauxCommission * 100));
      setFormPays(resParams.data.paysActifs.join(", "));
      setFormDevise(resParams.data.devise);
      setCorridors(resCorridors.data);
      const taux = {}, notes = {};
      resCorridors.data.forEach((c) => {
        taux[c._id] = c.tauxTaxeDouane !== null ? String(c.tauxTaxeDouane * 100) : "";
        notes[c._id] = c.noteReglementaire || "";
      });
      setTauxTaxeParCorridor(taux);
      setNoteParCorridor(notes);
    } catch (err) {
      setErreur("Impossible de charger les paramètres");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const handleEnregistrerParametres = async (e) => {
    e.preventDefault();
    try {
      const taux = Number(formTaux) / 100;
      const pays = formPays.split(",").map((p) => p.trim()).filter(Boolean);
      await modifierParametres({ tauxCommission: taux, paysActifs: pays, devise: formDevise });
      setMessage("Paramètres enregistrés.");
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleEnregistrerTaxe = async (corridorId) => {
    try {
      const valeur = tauxTaxeParCorridor[corridorId];
      const tauxTaxeDouane = valeur === "" ? null : Number(valeur) / 100;
      await modifierTaxeCorridor(corridorId, { tauxTaxeDouane, noteReglementaire: noteParCorridor[corridorId] || null });
      setMessage("Taxe du corridor enregistrée.");
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'enregistrement de la taxe");
    }
  };

  if (chargement) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 750 }}>
      <h2 style={{ marginBottom: 20 }}>Paramètres système</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}
      {message && <p style={{ color: "#33a852" }}>{message}</p>}

      <div className="card">
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Commission, pays, devise</h3>
        <form onSubmit={handleEnregistrerParametres}>
          <label>Taux de commission (%)</label>
          <input type="number" min="0" max="100" step="0.1" value={formTaux} onChange={(e) => setFormTaux(e.target.value)} required />

          <label>Pays actifs (séparés par des virgules)</label>
          <textarea rows={2} value={formPays} onChange={(e) => setFormPays(e.target.value)} required />

          <label>Devise</label>
          <input value={formDevise} onChange={(e) => setFormDevise(e.target.value)} required />
          <p style={{ fontSize: 11, color: "#999", margin: "4px 0 10px" }}>
            La plateforme fonctionne uniquement en FCFA pour l'instant — aucune conversion multi-devises réelle n'est
            branchée.
          </p>

          <button type="submit" className="btn">Enregistrer</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6, fontSize: 16 }}>Taxes par corridor</h3>
        <p style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>
          Aucun taux n'est jamais pré-rempli — renseigne-les uniquement une fois validés par un comptable ou juriste
          pour ce corridor précis.
        </p>
        {corridors.map((c) => (
          <div key={c._id} style={{ borderBottom: "1px solid #eee", paddingBottom: 12, marginBottom: 12 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>{c.nom}</p>
            <label style={{ fontSize: 12 }}>Taux de taxe/douane (%)</label>
            <input
              type="number" min="0" max="100" step="0.1"
              value={tauxTaxeParCorridor[c._id] || ""}
              onChange={(e) => setTauxTaxeParCorridor({ ...tauxTaxeParCorridor, [c._id]: e.target.value })}
              placeholder="Non renseigné"
            />
            <label style={{ fontSize: 12 }}>Note réglementaire</label>
            <textarea
              rows={2}
              value={noteParCorridor[c._id] || ""}
              onChange={(e) => setNoteParCorridor({ ...noteParCorridor, [c._id]: e.target.value })}
              placeholder="Ex. Validé par le cabinet X le JJ/MM/AAAA"
            />
            <button className="btn btn-secondary" onClick={() => handleEnregistrerTaxe(c._id)} style={{ marginTop: 6, fontSize: 13 }}>
              Enregistrer pour ce corridor
            </button>
          </div>
        ))}
        {corridors.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>Aucun corridor enregistré.</p>}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10, fontSize: 16 }}>Rôles de la plateforme</h3>
        <p style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>
          Les rôles sont fixes (définis dans le code) — cette section documente ce que chacun peut faire, ce n'est pas
          un éditeur de permissions.
        </p>
        {Object.entries(LABELS_ROLES).map(([role, desc]) => (
          <p key={role} style={{ fontSize: 13, margin: "6px 0" }}>
            <strong style={{ textTransform: "capitalize" }}>{role}</strong> — {desc}
          </p>
        ))}
      </div>
    </div>
  );
};

export default ParametresSysteme;
