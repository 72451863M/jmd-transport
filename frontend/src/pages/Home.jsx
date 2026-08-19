import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { user } = useAuth();

  return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ fontSize: 36, marginBottom: 16, color: "var(--route-navy)" }}>
        JMD-TRANSPORT
      </h1>
      <p style={{ fontSize: 18, color: "#555", maxWidth: 500, margin: "0 auto 30px" }}>
        La plateforme logistique qui connecte clients et transporteurs en Afrique de l'Ouest.
        Suivi GPS en temps réel, paiement Mobile Money.
      </p>

      {!user && (
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Link to="/register" className="btn">Commencer</Link>
          <Link to="/login" className="btn btn-secondary">Se connecter</Link>
        </div>
      )}

      {user && user.role === "client" && (
        <Link to="/client" className="btn">Accéder à mon espace</Link>
      )}
      {user && user.role === "transporteur" && (
        <Link to="/transporteur" className="btn">Voir mes livraisons</Link>
      )}
      {user && user.role === "admin" && (
        <Link to="/admin" className="btn">Administration</Link>
      )}
    </div>
  );
};

export default Home;
