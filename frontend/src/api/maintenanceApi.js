import axiosInstance from "./axiosInstance";

export const ajouterMaintenance = (data) => axiosInstance.post("/maintenance", data);

export const getHistoriqueMaintenance = (vehiculeId) => axiosInstance.get(`/maintenance/vehicules/${vehiculeId}`);

export const getEcheancesProches = () => axiosInstance.get("/maintenance/echeances");
