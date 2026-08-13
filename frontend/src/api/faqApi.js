import axiosInstance from "./axiosInstance";

export const getFAQ = () => axiosInstance.get("/faq");

export const rechercherAssistant = (question) => axiosInstance.get(`/faq/recherche?q=${encodeURIComponent(question)}`);

export const getToutesFAQ = () => axiosInstance.get("/faq/toutes");

export const ajouterFAQ = (data) => axiosInstance.post("/faq", data);

export const modifierFAQ = (id, data) => axiosInstance.put(`/faq/${id}`, data);

export const supprimerFAQ = (id) => axiosInstance.delete(`/faq/${id}`);
