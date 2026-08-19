import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Ferme le menu déroulant (mobile) après tout clic sur un lien —
  // sinon le menu resterait ouvert par-dessus la page suivante.
  const fermerMenu = () => setMenuOuvert(false);

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 24px",
        backgroundColor: "var(--route-navy)",
        color: "white",
        position: "relative",
      }}
    >
      <Link to="/" className="navbar-brand" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "white" }} onClick={fermerMenu}>
        JMD-TRANSPORT
      </Link>

      <button
        type="button"
        className="navbar-toggle"
        onClick={() => setMenuOuvert((v) => !v)}
        aria-label="Ouvrir le menu"
        aria-expanded={menuOuvert}
      >
        {menuOuvert ? "✕" : "☰"}
      </button>

      <div className={`navbar-links${menuOuvert ? " ouvert" : ""}`}>
        {!user && (
          <>
            <Link to="/login" style={{ color: "white" }} onClick={fermerMenu}>Connexion</Link>
            <Link to="/register" style={{ color: "white" }} onClick={fermerMenu}>Inscription</Link>
          </>
        )}

        {user && user.role === "client" && (
          <Link to="/client" style={{ color: "white" }} onClick={fermerMenu}>Mon espace</Link>
        )}
        {user && user.role === "transporteur" && (
          <Link to="/transporteur" style={{ color: "white" }} onClick={fermerMenu}>Mes livraisons</Link>
        )}
        {user && user.role === "admin" && (
          <>
            <Link to="/admin" style={{ color: "white" }} onClick={fermerMenu}>Administration</Link>
            <Link to="/admin/parametres" style={{ color: "white" }} onClick={fermerMenu}>Paramètres</Link>
            <Link to="/admin/audit" style={{ color: "white" }} onClick={fermerMenu}>Journal d'audit</Link>
            <Link to="/admin/tickets" style={{ color: "white" }} onClick={fermerMenu}>Tickets</Link>
            <Link to="/admin/faq" style={{ color: "white" }} onClick={fermerMenu}>FAQ</Link>
            <Link to="/admin/comptabilite" style={{ color: "white" }} onClick={fermerMenu}>Comptabilité</Link>
          </>
        )}

        {user && (
          <Link to="/assistance" style={{ color: "white" }} onClick={fermerMenu}>Assistance</Link>
        )}

        {user && user.entreprise?.entrepriseId && (
          <Link to="/entreprise" style={{ color: "white" }} onClick={fermerMenu}>Mon entreprise</Link>
        )}
        {user && user.role === "transporteur" && (
          <>
            <Link to="/flotte" style={{ color: "white" }} onClick={fermerMenu}>Ma flotte</Link>
            <Link to="/chauffeurs" style={{ color: "white" }} onClick={fermerMenu}>Mes chauffeurs</Link>
            <Link to="/performances" style={{ color: "white" }} onClick={fermerMenu}>Mes performances</Link>
          </>
        )}
        {user && (
          <>
            <Link to="/kyc" style={{ color: "white" }} onClick={fermerMenu}>Mon KYC</Link>
            <NotificationBell />
            <span style={{ fontSize: 13, opacity: 0.85 }}>Bonjour, {user.nom}</span>
            <button onClick={() => { fermerMenu(); handleLogout(); }} className="btn">Déconnexion</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
