import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 24px",
        backgroundColor: "#1a3c6e",
        color: "white",
      }}
    >
      <Link to="/" style={{ fontWeight: 700, fontSize: 20, color: "white" }}>
        JMD-TRANSPORT
      </Link>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {!user && (
          <>
            <Link to="/login" style={{ color: "white" }}>Connexion</Link>
            <Link to="/register" style={{ color: "white" }}>Inscription</Link>
          </>
        )}

        {user && user.role === "client" && (
          <Link to="/client" style={{ color: "white" }}>Mon espace</Link>
        )}
        {user && user.role === "transporteur" && (
          <Link to="/transporteur" style={{ color: "white" }}>Mes livraisons</Link>
        )}
        {user && user.role === "admin" && (
          <Link to="/admin" style={{ color: "white" }}>Administration</Link>
        )}

        {user && user.role === "client" && (
          <Link to="/entreprise" style={{ color: "white" }}>Mon entreprise</Link>
        )}
        {user && (
          <>
            <Link to="/kyc" style={{ color: "white" }}>Mon KYC</Link>
            <NotificationBell />
            <span style={{ fontSize: 13, opacity: 0.85 }}>Bonjour, {user.nom}</span>
            <button onClick={handleLogout} className="btn">Déconnexion</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
