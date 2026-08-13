import axiosInstance from "./axiosInstance";

export const creerTicket = (data) => axiosInstance.post("/tickets", data);

export const getMesTickets = () => axiosInstance.get("/tickets/mes-tickets");

export const getTousLesTickets = (statut) => axiosInstance.get(`/tickets${statut ? `?statut=${statut}` : ""}`);

export const getTicketById = (id) => axiosInstance.get(`/tickets/${id}`);

export const ajouterMessageTicket = (id, texte) => axiosInstance.post(`/tickets/${id}/messages`, { texte });

export const changerStatutTicket = (id, statut) => axiosInstance.put(`/tickets/${id}/statut`, { statut });
