import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const data = await login(form.email, form.password);
      if (data.role === "admin") navigate("/admin");
      else if (data.role === "transporteur") navigate("/transporteur");
      else navigate("/client");
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur de connexion");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="form-wrapper card">
      <h2 style={{ marginBottom: 20 }}>Connexion</h2>
      {erreur && <p style={{ color: "red", marginBottom: 12 }}>{erreur}</p>}
      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} required />

        <label>Mot de passe</label>
        <input type="password" name="password" value={form.password} onChange={handleChange} required />

        <button type="submit" className="btn" style={{ width: "100%" }} disabled={chargement}>
          {chargement ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        Pas encore de compte ? <Link to="/register" style={{ color: "var(--cargo-orange)" }}>Inscrivez-vous</Link>
      </p>
    </div>
  );
};

export default Login;
