import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { getDossiersKYCEnAttente, validerKYC, rejeterKYC } from "../api/kycApi";
import { getReclamations, repondreReclamation } from "../api/reclamationApi";
import { getStatistiques, getZonesPopulaires, getClassementTransporteurs } from "../api/biApi";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [dossiersKYC, setDossiersKYC] = useState([]);
  const [reclamations, setReclamations] = useState([]);
  const [statsBI, setStatsBI] = useState(null);
  const [zonesBI, setZonesBI] = useState(null);
  const [classementBI, setClassementBI] = useState([]);
  const [chargement, setChargement] = useState(true);

  const charger = async () => {
    try {
      const [resUsers, resLivraisons, resKYC, resReclamations, resStats, resZones, resClassement] = await Promise.all([
        axiosInstance.get("/users"),
        axiosInstance.get("/livraisons"),
        getDossiersKYCEnAttente(),
        getReclamations("ouverte"),
        getStatistiques(),
        getZonesPopulaires(),
        getClassementTransporteurs(),
      ]);
      setUsers(resUsers.data);
      setLivraisons(resLivraisons.data);
      setDossiersKYC(resKYC.data);
      setReclamations(resReclamations.data);
      setStatsBI(resStats.data);
      setZonesBI(resZones.data);
      setClassementBI(resClassement.data);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const toggleStatus = async (id) => {
    await axiosInstance.put(`/users/${id}/statut`);
    charger();
  };

  const handleValiderKYC = async (userId) => {
    try {
      await validerKYC(userId);
      charger();
    } catch (err) {
      window.alert(err.response?.data?.message || "Erreur lors de la validation");
    }
  };

  const handleRejeterKYC = async (userId) => {
    const motif = window.prompt("Motif du rejet (obligatoire) :");
    if (!motif) return;
    try {
      await rejeterKYC(userId, motif);
      charger();
    } catch (err) {
      window.alert(err.response?.data?.message || "Erreur lors du rejet");
    }
  };

  const handleRepondreReclamation = async (id) => {
    const texte = window.prompt("Réponse à envoyer :");
    if (!texte) return;
    const statut = window.prompt("Nouveau statut (en_cours / resolue / rejetee) :", "resolue");
    if (!["en_cours", "resolue", "rejetee"].includes(statut)) {
      window.alert("Statut invalide, réponse annulée.");
      return;
    }
    try {
      await repondreReclamation(id, texte, statut);
      charger();
    } catch (err) {
      window.alert(err.response?.data?.message || "Erreur lors de la réponse");
    }
  };

  if (chargement) return <p style={{ textAlign: "center", marginTop: 40 }}>Chargement...</p>;

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60 }}>
      <h2 style={{ marginBottom: 20 }}>Tableau de bord Administration</h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: 1, minWidth: 140 }}>
          <h3>{users.length}</h3>
          <p>Utilisateurs</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 140 }}>
          <h3>{livraisons.length}</h3>
          <p>Livraisons</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 140 }}>
          <h3>{livraisons.filter((l) => l.statut === "en_cours").length}</h3>
          <p>En cours</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 140 }}>
          <h3>{dossiersKYC.length}</h3>
          <p>KYC en attente</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 140 }}>
          <h3>{reclamations.length}</h3>
          <p>Réclamations ouvertes</p>
        </div>
      </div>

      {statsBI && (
        <>
          <h3 style={{ marginBottom: 12 }}>Business Intelligence</h3>
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div className="card" style={{ flex: 1, minWidth: 160 }}>
              <h3>{statsBI.revenuTotal.toLocaleString()} FCFA</h3>
              <p>Revenu total (livraisons livrées)</p>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 160 }}>
              <h3>{statsBI.commissionTotale.toLocaleString()} FCFA</h3>
              <p>Commission totale</p>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 160 }}>
              <h3>{statsBI.nbTransfrontalier}</h3>
              <p>Livraisons transfrontalières</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div className="card" style={{ flex: 1, minWidth: 260 }}>
              <h4 style={{ marginBottom: 10, fontSize: 15 }}>Zones de départ les plus demandées</h4>
              {zonesBI?.departsPopulaires?.length ? (
                zonesBI.departsPopulaires.map((z) => (
                  <p key={z.label} style={{ fontSize: 13, margin: "4px 0" }}>{z.label} — <strong>{z.count}</strong></p>
                ))
              ) : (
                <p style={{ fontSize: 13, color: "#777" }}>Pas encore assez de données.</p>
              )}
            </div>
            <div className="card" style={{ flex: 1, minWidth: 260 }}>
              <h4 style={{ marginBottom: 10, fontSize: 15 }}>Classement des transporteurs</h4>
              {classementBI.length ? (
                classementBI.map((t, i) => (
                  <p key={t.id} style={{ fontSize: 13, margin: "4px 0" }}>
                    {i + 1}. {t.nom} — {t.missionsCompletees} missions
                    {t.scoreFiabilite !== null && ` · score ${t.scoreFiabilite}/100`}
                  </p>
                ))
              ) : (
                <p style={{ fontSize: 13, color: "#777" }}>Pas encore de transporteur actif.</p>
              )}
            </div>
          </div>
        </>
      )}

      {reclamations.length > 0 && (
        <>
          <h3 style={{ marginBottom: 12 }}>Réclamations ouvertes</h3>
          {reclamations.map((r) => (
            <div key={r._id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <strong>{r.motif.replace(/_/g, " ")}</strong>
                <span style={{ fontSize: 13, color: "#777" }}>
                  {r.auteur?.nom} ({r.roleAuteur}) — {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p style={{ fontSize: 14, margin: "6px 0" }}>{r.description}</p>
              {r.livraison && (
                <p style={{ fontSize: 13, color: "#777" }}>
                  {r.livraison.adresseDepart?.label} → {r.livraison.adresseArrivee?.label}
                </p>
              )}
              <button className="btn" onClick={() => handleRepondreReclamation(r._id)} style={{ marginTop: 6 }}>
                Répondre
              </button>
            </div>
          ))}
        </>
      )}

      {dossiersKYC.length > 0 && (
        <>
          <h3 style={{ marginBottom: 12 }}>Dossiers KYC en attente de validation</h3>
          {dossiersKYC.map((u) => (
            <div key={u._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <strong>{u.nom}</strong> — {u.email} — <em>{u.role}</em>
                <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0" }}>
                  Documents déposés : {u.kyc.documents.map((d) => d.type).join(", ")}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => handleValiderKYC(u._id)}>Valider</button>
                <button
                  onClick={() => handleRejeterKYC(u._id)}
                  style={{ background: "none", border: "1px solid #cc3333", color: "#cc3333", borderRadius: 6, padding: "8px 14px", cursor: "pointer" }}
                >
                  Rejeter
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <h3 style={{ marginBottom: 12, marginTop: 24 }}>Utilisateurs</h3>
      {users.map((u) => (
        <div key={u._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>{u.nom}</strong> — {u.email} — <em>{u.role}</em>
            {u.role === "transporteur" && u.scoreIA !== null && u.scoreIA !== undefined && (
              <span style={{ marginLeft: 10, fontSize: 13, color: "#555" }}>Score IA : {u.scoreIA}/100</span>
            )}
          </div>
          <button className="btn" onClick={() => toggleStatus(u._id)}>
            {u.actif ? "Désactiver" : "Activer"}
          </button>
        </div>
      ))}

      <h3 style={{ margin: "24px 0 12px" }}>Livraisons récentes</h3>
      {livraisons.slice(0, 10).map((l) => (
        <div key={l._id} className="card">
          <strong>{l.adresseDepart.label} → {l.adresseArrivee.label}</strong>
          <span className={`badge ${l.statut}`} style={{ marginLeft: 10 }}>{l.statut}</span>
          {l.commission ? <span style={{ marginLeft: 10, fontSize: 13, color: "#777" }}>Commission : {l.commission} FCFA</span> : null}
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
