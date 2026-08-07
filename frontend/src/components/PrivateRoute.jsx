import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// rolesAutorises : tableau optionnel, ex: ["admin"], ["client", "transporteur"]
const PrivateRoute = ({ children, rolesAutorises }) => {
  const { user, loading } = useAuth();

  if (loading) return <p style={{ textAlign: "center", marginTop: 40 }}>Chargement...</p>;

  if (!user) return <Navigate to="/login" replace />;

  if (rolesAutorises && !rolesAutorises.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
