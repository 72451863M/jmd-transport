import axiosInstance from "./axiosInstance";

export const getMonGroupeCollaboratif = (livraisonId) =>
  axiosInstance.get(`/collaboratif/livraisons/${livraisonId}/groupe`);

export const getTousLesGroupesCollaboratifs = () => axiosInstance.get("/collaboratif/groupes");
