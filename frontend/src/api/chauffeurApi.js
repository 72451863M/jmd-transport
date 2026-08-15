import axiosInstance from "./axiosInstance";

export const ajouterChauffeur = (data) => axiosInstance.post("/chauffeurs", data);

export const getMesChauffeurs = () => axiosInstance.get("/chauffeurs");

export const modifierChauffeur = (id, data) => axiosInstance.put(`/chauffeurs/${id}`, data);

export const supprimerChauffeur = (id) => axiosInstance.delete(`/chauffeurs/${id}`);

export const getHistoriqueMissions = (id) => axiosInstance.get(`/chauffeurs/${id}/historique`);
