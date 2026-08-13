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
          <>
            <Link to="/admin" style={{ color: "white" }}>Administration</Link>
            <Link to="/admin/parametres" style={{ color: "white" }}>Paramètres</Link>
            <Link to="/admin/audit" style={{ color: "white" }}>Journal d'audit</Link>
            <Link to="/admin/tickets" style={{ color: "white" }}>Tickets</Link>
            <Link to="/admin/faq" style={{ color: "white" }}>FAQ</Link>
            <Link to="/admin/comptabilite" style={{ color: "white" }}>Comptabilité</Link>
          </>
        )}

        {user && (
          <Link to="/assistance" style={{ color: "white" }}>Assistance</Link>
        )}

        {user && (user.role === "client" || user.role === "transporteur") && (
          <Link to="/entreprise" style={{ color: "white" }}>Mon entreprise</Link>
        )}
        {user && user.role === "transporteur" && (
          <>
            <Link to="/flotte" style={{ color: "white" }}>Ma flotte</Link>
            <Link to="/chauffeurs" style={{ color: "white" }}>Mes chauffeurs</Link>
            <Link to="/performances" style={{ color: "white" }}>Mes performances</Link>
          </>
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
