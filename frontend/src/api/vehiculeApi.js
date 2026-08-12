import axiosInstance from "./axiosInstance";

export const ajouterVehicule = (data) => axiosInstance.post("/vehicules", data);

export const getMesVehicules = () => axiosInstance.get("/vehicules");

export const modifierVehicule = (id, data) => axiosInstance.put(`/vehicules/${id}`, data);

export const supprimerVehicule = (id) => axiosInstance.delete(`/vehicules/${id}`);
