import axiosInstance from "./axiosInstance";

export const creerReclamation = (livraisonId, motif, description, pieceJointeUrl) =>
  axiosInstance.post("/reclamations", { livraisonId, motif, description, pieceJointeUrl });

export const getMesReclamations = () => axiosInstance.get("/reclamations/mes");

export const getReclamations = (statut) =>
  axiosInstance.get("/reclamations", { params: statut ? { statut } : {} });

export const repondreReclamation = (id, texte, statut) =>
  axiosInstance.patch(`/reclamations/${id}/repondre`, { texte, statut });
