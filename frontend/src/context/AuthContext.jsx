import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charge l'utilisateur depuis le localStorage au démarrage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (err) {
        console.error("Données de session corrompues, déconnexion :", err);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const register = async (formData) => {
    const { data } = await axiosInstance.post("/auth/register", formData);
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await axiosInstance.post("/auth/login", { email, password });
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  // Permet de mettre à jour certains champs de l'utilisateur connecté sans
  // devoir se déconnecter/reconnecter (ex. après avoir créé/rejoint une
  // entreprise, pour que "Mon entreprise" apparaisse immédiatement).
  const mettreAJourUser = (champsPartiels) => {
    setUser((utilisateurActuel) => {
      const utilisateurMisAJour = { ...utilisateurActuel, ...champsPartiels };
      localStorage.setItem("user", JSON.stringify(utilisateurMisAJour));
      return utilisateurMisAJour;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, mettreAJourUser }}>
      {children}
    </AuthContext.Provider>
  );
};
