import axiosInstance from "./axiosInstance";

export const getMessagesLivraison = (livraisonId) => axiosInstance.get(`/livraisons/${livraisonId}/messages`);

export const envoyerMessage = (livraisonId, texte) =>
  axiosInstance.post(`/livraisons/${livraisonId}/messages`, { texte });
