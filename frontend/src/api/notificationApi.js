import axiosInstance from "./axiosInstance";

export const getMesNotifications = () => axiosInstance.get("/notifications");

export const getNombreNonLues = () => axiosInstance.get("/notifications/non-lues/count");

export const marquerCommeLue = (id) => axiosInstance.patch(`/notifications/${id}/lu`);
