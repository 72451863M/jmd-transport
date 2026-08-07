import axiosInstance from "./axiosInstance";

export const getDocumentsLivraison = (livraisonId) => axiosInstance.get(`/livraisons/${livraisonId}/documents`);

export const ajouterDocument = (livraisonId, type, url) =>
  axiosInstance.post(`/livraisons/${livraisonId}/documents`, { type, url });
