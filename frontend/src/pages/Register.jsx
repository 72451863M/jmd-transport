import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: "",
    email: "",
    telephone: "",
    password: "",
    role: "client",
    vehiculeType: "",
    vehiculeImmatriculation: "",
  });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const payload = {
        nom: form.nom,
        email: form.email,
        telephone: form.telephone,
        password: form.password,
        role: form.role,
        vehicule:
          form.role === "transporteur"
            ? { type: form.vehiculeType, immatriculation: form.vehiculeImmatriculation }
            : undefined,
      };
      const data = await register(payload);
      if (data.role === "transporteur") navigate("/transporteur");
      else navigate("/client");
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="form-wrapper card">
      <h2 style={{ marginBottom: 20 }}>Créer un compte</h2>
      {erreur && <p style={{ color: "red", marginBottom: 12 }}>{erreur}</p>}
      <form onSubmit={handleSubmit}>
        <label>Nom complet</label>
        <input name="nom" value={form.nom} onChange={handleChange} required />

        <label>Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} required />

        <label>Téléphone</label>
        <input name="telephone" value={form.telephone} onChange={handleChange} required />

        <label>Mot de passe</label>
        <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} />

        <label>Je suis</label>
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="client">Client</option>
          <option value="transporteur">Transporteur</option>
        </select>

        {form.role === "transporteur" && (
          <>
            <label>Type de véhicule</label>
            <input
              name="vehiculeType"
              placeholder="Moto, Camionnette, Camion..."
              value={form.vehiculeType}
              onChange={handleChange}
            />
            <label>Immatriculation</label>
            <input
              name="vehiculeImmatriculation"
              value={form.vehiculeImmatriculation}
              onChange={handleChange}
            />
          </>
        )}

        <button type="submit" className="btn" style={{ width: "100%" }} disabled={chargement}>
          {chargement ? "Création..." : "S'inscrire"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        Déjà un compte ? <Link to="/login" style={{ color: "var(--cargo-orange)" }}>Connectez-vous</Link>
      </p>
    </div>
  );
};

export default Register;
