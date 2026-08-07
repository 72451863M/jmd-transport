import axiosInstance from "./axiosInstance";

export const getStatistiques = () => axiosInstance.get("/bi/statistiques");
export const getZonesPopulaires = () => axiosInstance.get("/bi/zones-populaires");
export const getClassementTransporteurs = () => axiosInstance.get("/bi/classement-transporteurs");
