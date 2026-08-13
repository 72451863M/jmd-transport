import React, { useEffect, useState } from "react";
import { getLivraisons } from "../api/livraisonApi";
import { modifierStatutPaiement, creerRemboursement, getRemboursements, getRapportFinancier } from "../api/comptabiliteApi";

const LABELS_STATUT_PAIEMENT = { en_attente: "En attente", paye: "Payé", echoue: "Échoué" };
const COULEURS_STATUT_PAIEMENT = { en_attente: "#cc5500", paye: "#33a852", echoue: "#cc3333" };

const Comptabilite = () => {
  const [rapport, setRapport] = useState(null);
  const [livraisonsLivrees, setLivraisonsLivrees] = useState([]);
  const [remboursements, setRemboursements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [formRemboursement, setFormRemboursement] = useState({ livraisonId: "", montant: "", motif: "" });

  const charger = async () => {
    try {
      const [resRapport, resLivraisons, resRemboursements] = await Promise.all([
        getRapportFinancier(),
        getLivraisons(),
        getRemboursements(),
      ]);
      setRapport(resRapport.data);
      setLivraisonsLivrees(resLivraisons.data.filter((l) => l.statut === "livree"));
      setRemboursements(resRemboursements.data);
    } catch (err) {
      setErreur("Impossible de charger les données comptables");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const handleChangerStatutPaiement = async (livraisonId, statutPaiement) => {
    try {
      await modifierStatutPaiement(livraisonId, statutPaiement);
      setMessage("Statut de paiement mis à jour.");
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de la mise à jour");
    }
  };

  const handleCreerRemboursement = async (e) => {
    e.preventDefault();
    try {
      await creerRemboursement({ ...formRemboursement, montant: Number(formRemboursement.montant) });
      setFormRemboursement({ livraisonId: "", montant: "", motif: "" });
      setMessage("Remboursement enregistré.");
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'enregistrement");
    }
  };

  if (chargement) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 800 }}>
      <h2 style={{ marginBottom: 6 }}>Comptabilité</h2>
      <p style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>
        Aucun paiement ni remboursement réel n'est traité automatiquement ici (Mobile Money non branché — Module 13) —
        cette page enregistre et suit ce qui a été confirmé en dehors de l'application.
      </p>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}
      {message && <p style={{ color: "#33a852" }}>{message}</p>}

      {rapport && (
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: 1, minWidth: 140 }}>
            <h3>{rapport.montantTotalFacture.toLocaleString()}</h3>
            <p>FCFA facturés ({rapport.nbFactures} factures)</p>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 140 }}>
            <h3>{rapport.commissionTotale.toLocaleString()}</h3>
            <p>FCFA de commission</p>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 140 }}>
            <h3>{rapport.montantNetTransporteurs.toLocaleString()}</h3>
            <p>FCFA nets transporteurs</p>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 140 }}>
            <h3>{rapport.montantTotalRembourse.toLocaleString()}</h3>
            <p>FCFA remboursés ({rapport.nbRemboursements})</p>
          </div>
        </div>
      )}

      {rapport && (
        <div className="card">
          <h3 style={{ marginBottom: 10, fontSize: 16 }}>Répartition des paiements</h3>
          {Object.entries(rapport.repartitionParStatutPaiement).map(([statut, nb]) => (
            <p key={statut} style={{ fontSize: 14, margin: "4px 0" }}>
              <span style={{ color: COULEURS_STATUT_PAIEMENT[statut], fontWeight: 700 }}>{LABELS_STATUT_PAIEMENT[statut]}</span> : {nb} livraison(s)
            </p>
          ))}
        </div>
      )}

      <h3 style={{ margin: "20px 0 10px" }}>Livraisons livrées ({livraisonsLivrees.length})</h3>
      {livraisonsLivrees.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>Aucune livraison livrée pour le moment.</p>}
      {livraisonsLivrees.map((l) => (
        <div key={l._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <strong>{l.adresseDepart.label} → {l.adresseArrivee.label}</strong>
            <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0" }}>{l.prix} FCFA — commission {l.commission} FCFA</p>
          </div>
          <select
            value={l.statutPaiement || "en_attente"}
            onChange={(e) => handleChangerStatutPaiement(l._id, e.target.value)}
            style={{ borderColor: COULEURS_STATUT_PAIEMENT[l.statutPaiement || "en_attente"] }}
          >
            {Object.entries(LABELS_STATUT_PAIEMENT).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>
      ))}

      <div className="card">
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Enregistrer un remboursement</h3>
        <form onSubmit={handleCreerRemboursement}>
          <label>Livraison concernée</label>
          <select value={formRemboursement.livraisonId} onChange={(e) => setFormRemboursement({ ...formRemboursement, livraisonId: e.target.value })} required>
            <option value="">-- Choisir une livraison --</option>
            {livraisonsLivrees.map((l) => (
              <option key={l._id} value={l._id}>{l.adresseDepart.label} → {l.adresseArrivee.label} ({l.prix} FCFA)</option>
            ))}
          </select>

          <label>Montant (FCFA)</label>
          <input type="number" min="1" value={formRemboursement.montant} onChange={(e) => setFormRemboursement({ ...formRemboursement, montant: e.target.value })} required />

          <label>Motif</label>
          <textarea rows={2} value={formRemboursement.motif} onChange={(e) => setFormRemboursement({ ...formRemboursement, motif: e.target.value })} required />

          <button type="submit" className="btn" style={{ marginTop: 10 }}>Enregistrer</button>
        </form>
      </div>

      <h3 style={{ margin: "20px 0 10px" }}>Remboursements enregistrés ({remboursements.length})</h3>
      {remboursements.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>Aucun remboursement enregistré.</p>}
      {remboursements.map((r) => (
        <div key={r._id} className="card">
          <strong>{r.montant.toLocaleString()} FCFA</strong> — {r.motif}
          {r.livraison && (
            <p style={{ fontSize: 12, color: "#777", margin: "4px 0 0" }}>
              {r.livraison.adresseDepart?.label} → {r.livraison.adresseArrivee?.label}
            </p>
          )}
          <p style={{ fontSize: 11, color: "#999", margin: "2px 0 0" }}>{new Date(r.createdAt).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};

export default Comptabilite;
