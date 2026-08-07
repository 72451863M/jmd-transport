import axiosInstance from "./axiosInstance";

export const estimerPrix = (data) => axiosInstance.post("/livraisons/estimation", data);

export const creerLivraison = (data) => axiosInstance.post("/livraisons", data);

export const getLivraisons = () => axiosInstance.get("/livraisons");

export const getLivraisonById = (id) => axiosInstance.get(`/livraisons/${id}`);

export const accepterLivraison = (id) => axiosInstance.put(`/livraisons/${id}/accepter`);

export const updateStatutLivraison = (id, statut, motif) =>
  axiosInstance.put(`/livraisons/${id}/statut`, { statut, motif });

export const livrerAvecPreuve = (id, data) => axiosInstance.post(`/livraisons/${id}/livrer`, data);

export const evaluerLivraison = (id, note, commentaire) =>
  axiosInstance.post(`/livraisons/${id}/evaluer`, { note, commentaire });

export const getTransporteurs = () => axiosInstance.get("/users/transporteurs");
