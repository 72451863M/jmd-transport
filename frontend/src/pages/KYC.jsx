import React, { useEffect, useState } from "react";
import { donnerConsentementKYC, ajouterDocumentKYC, getMonStatutKYC } from "../api/kycApi";

const LABELS_DOCUMENTS = {
  cni_nina: "Carte d'identité (CNI) ou NINA",
  permis_conduire: "Permis de conduire",
  carte_grise: "Carte grise du véhicule",
  rccm: "RCCM (entreprise)",
  nif: "NIF (entreprise)",
};

const LABELS_STATUT = {
  non_soumis: "Dossier non soumis",
  incomplet: "Dossier incomplet",
  en_attente_validation: "En attente de validation (24-48h)",
  valide: "Dossier validé",
  rejete: "Dossier rejeté",
};

const KYC = () => {
  const [statut, setStatut] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [urls, setUrls] = useState({});

  const charger = async () => {
    try {
      const { data } = await getMonStatutKYC();
      setStatut(data);
    } catch (err) {
      setErreur("Impossible de charger le statut KYC");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const handleConsentement = async () => {
    try {
      await donnerConsentementKYC();
      setMessage("Consentement enregistré. Tu peux maintenant déposer tes documents.");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur");
    }
  };

  const handleAjouterDocument = async (type) => {
    const url = urls[type];
    if (!url) {
      setErreur("Renseigne l'URL du document avant de l'ajouter.");
      return;
    }
    try {
      await ajouterDocumentKYC(type, url);
      setMessage("Document ajouté.");
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'ajout du document");
    }
  };

  if (chargement) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

  const consentementDonne = statut && !erreur && statut.statutGlobal !== undefined;

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 60, maxWidth: 600 }}>
      <h2 style={{ marginBottom: 6 }}>Vérification d'identité (KYC)</h2>
      <p style={{ fontSize: 13, color: "#777", marginBottom: 20 }}>
        Conformément à la Loi n°2013-015 du Mali sur la protection des données personnelles,
        ton consentement est requis avant tout dépôt de pièce d'identité.
      </p>

      {erreur && <p style={{ color: "red" }}>{erreur}</p>}
      {message && <p style={{ color: "#33a852" }}>{message}</p>}

      {statut && (
        <div className="card">
          <p style={{ fontWeight: 700 }}>
            Statut : {LABELS_STATUT[statut.statutGlobal] || statut.statutGlobal}
          </p>
          {statut.statutGlobal === "rejete" && statut.motifRejet && (
            <p style={{ color: "#cc3333", fontSize: 14 }}>Motif du rejet : {statut.motifRejet}</p>
          )}
        </div>
      )}

      {statut && statut.statutGlobal !== "valide" && (
        <div className="card">
          <button className="btn" onClick={handleConsentement} style={{ marginBottom: 16 }}>
            Donner mon consentement
          </button>

          <h3 style={{ marginBottom: 10, fontSize: 16 }}>Documents requis</h3>
          {statut.documentsRequis.map((type) => {
            const depose = statut.documentsDeposes.includes(type);
            return (
              <div key={type} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #eee" }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>
                  {LABELS_DOCUMENTS[type] || type} {depose && <span style={{ color: "#33a852" }}>✓ déposé</span>}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="URL du document (ex. lien Cloudinary)"
                    value={urls[type] || ""}
                    onChange={(e) => setUrls({ ...urls, [type]: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-secondary" onClick={() => handleAjouterDocument(type)}>
                    {depose ? "Remplacer" : "Ajouter"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KYC;
