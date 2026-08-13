import axiosInstance from "./axiosInstance";

export const modifierStatutPaiement = (livraisonId, statutPaiement) =>
  axiosInstance.put(`/comptabilite/livraisons/${livraisonId}/statut-paiement`, { statutPaiement });

export const creerRemboursement = (data) => axiosInstance.post("/comptabilite/remboursements", data);

export const getRemboursements = () => axiosInstance.get("/comptabilite/remboursements");

export const getRapportFinancier = () => axiosInstance.get("/comptabilite/rapport");
