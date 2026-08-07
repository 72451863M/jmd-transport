import axiosInstance from "./axiosInstance";

export const creerEntreprise = (data) => axiosInstance.post("/entreprises", data);

export const getMonEntreprise = () => axiosInstance.get("/entreprises/moi");

export const ajouterCollaborateur = (email) => axiosInstance.post("/entreprises/collaborateurs", { email });
