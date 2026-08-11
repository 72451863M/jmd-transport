import axiosInstance from "./axiosInstance";

export const donnerConsentementKYC = () => axiosInstance.post("/kyc/consentement");

export const ajouterDocumentKYC = (type, url) =>
  axiosInstance.post("/kyc/documents", { type, url });

export const getMonStatutKYC = () => axiosInstance.get("/kyc/statut");

export const getDossiersKYCEnAttente = () => axiosInstance.get("/kyc/en-attente");

export const getDossiersKYCIncomplets = () => axiosInstance.get("/kyc/incomplets");

export const relancerKYC = (userId) => axiosInstance.post(`/kyc/${userId}/relancer`);

export const validerKYC = (userId) => axiosInstance.patch(`/kyc/${userId}/valider`);

export const rejeterKYC = (userId, motif) =>
  axiosInstance.patch(`/kyc/${userId}/rejeter`, { motif });
