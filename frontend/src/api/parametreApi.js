import axiosInstance from "./axiosInstance";

export const getParametres = () => axiosInstance.get("/parametres");

export const modifierParametres = (data) => axiosInstance.put("/parametres", data);

export const modifierTaxeCorridor = (corridorId, data) => axiosInstance.put(`/corridors/${corridorId}/taxe`, data);

export const getCorridors = () => axiosInstance.get("/corridors");
