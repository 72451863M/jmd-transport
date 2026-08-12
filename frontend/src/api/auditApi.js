import axiosInstance from "./axiosInstance";

export const getJournalAudit = (filtres = {}) => {
  const params = new URLSearchParams();
  if (filtres.typeAction) params.set("typeAction", filtres.typeAction);
  if (filtres.limite) params.set("limite", filtres.limite);
  const query = params.toString();
  return axiosInstance.get(`/audit${query ? `?${query}` : ""}`);
};
