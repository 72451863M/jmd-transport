import React from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClientDashboard from "./pages/ClientDashboard";
import TransporteurDashboard from "./pages/TransporteurDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Tracking from "./pages/Tracking";
import KYC from "./pages/KYC";
import Entreprise from "./pages/Entreprise";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/kyc"
          element={
            <PrivateRoute>
              <KYC />
            </PrivateRoute>
          }
        />

        <Route
          path="/entreprise"
          element={
            <PrivateRoute>
              <Entreprise />
            </PrivateRoute>
          }
        />

        <Route
          path="/client"
          element={
            <PrivateRoute rolesAutorises={["client"]}>
              <ClientDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/transporteur"
          element={
            <PrivateRoute rolesAutorises={["transporteur"]}>
              <TransporteurDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <PrivateRoute rolesAutorises={["admin"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/tracking/:id"
          element={
            <PrivateRoute>
              <Tracking />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
