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

// Taille max acceptée côté navigateur pour éviter des documents trop lourds
// (les fichiers sont convertis en base64 et stockés directement en base,
// il n'y a pas encore de service externe comme Cloudinary de branché).
const TAILLE_MAX_OCTETS = 4 * 1024 * 1024; // 4 Mo

function fichierVersBase64(fichier) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(fichier);
  });
}

const KYC = () => {
  const [statut, setStatut] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [apercus, setApercus] = useState({});
  const [donneesBase64, setDonneesBase64] = useState({});
  const [envoiEnCours, setEnvoiEnCours] = useState({});

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

  const handleChoixFichier = async (type, fichier) => {
    setErreur("");
    if (!fichier) return;
    if (fichier.size > TAILLE_MAX_OCTETS) {
      setErreur("Le fichier est trop volumineux (4 Mo maximum). Essaie une photo compressée.");
      return;
    }
    try {
      const base64 = await fichierVersBase64(fichier);
      setDonneesBase64((prev) => ({ ...prev, [type]: base64 }));
      setApercus((prev) => ({ ...prev, [type]: base64 }));
    } catch (err) {
      setErreur("Impossible de lire ce fichier, réessaie.");
    }
  };

  const handleEnvoyerDocument = async (type) => {
    const base64 = donneesBase64[type];
    if (!base64) {
      setErreur("Choisis d'abord une photo ou un fichier avant d'envoyer.");
      return;
    }
    setEnvoiEnCours((prev) => ({ ...prev, [type]: true }));
    try {
      await ajouterDocumentKYC(type, base64);
      setMessage("Document envoyé.");
      setErreur("");
      charger();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'envoi du document");
    } finally {
      setEnvoiEnCours((prev) => ({ ...prev, [type]: false }));
    }
  };

  if (chargement) return <div className="container" style={{ paddingTop: 30 }}><p>Chargement...</p></div>;

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

                {apercus[type] && (
                  <div style={{ marginBottom: 8 }}>
                    {apercus[type].startsWith("data:image") ? (
                      <img src={apercus[type]} alt="Aperçu du document" style={{ maxWidth: 160, maxHeight: 120, borderRadius: 6, border: "1px solid #ddd" }} />
                    ) : (
                      <p style={{ fontSize: 12, color: "#555" }}>Fichier sélectionné, prêt à envoyer.</p>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleChoixFichier(type, e.target.files[0])}
                    style={{ flex: 1, minWidth: 180 }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEnvoyerDocument(type)}
                    disabled={envoiEnCours[type] || !donneesBase64[type]}
                  >
                    {envoiEnCours[type] ? "Envoi..." : depose ? "Remplacer" : "Envoyer"}
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
