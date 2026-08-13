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
import MaFlotte from "./pages/MaFlotte";
import MesChauffeurs from "./pages/MesChauffeurs";
import MesPerformances from "./pages/MesPerformances";
import ParametresSysteme from "./pages/ParametresSysteme";
import JournalAudit from "./pages/JournalAudit";
import CentreAssistance from "./pages/CentreAssistance";
import TicketDetail from "./pages/TicketDetail";
import AdminTickets from "./pages/AdminTickets";
import AdminFAQ from "./pages/AdminFAQ";
import Comptabilite from "./pages/Comptabilite";

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
          path="/flotte"
          element={
            <PrivateRoute>
              <MaFlotte />
            </PrivateRoute>
          }
        />

        <Route
          path="/chauffeurs"
          element={
            <PrivateRoute>
              <MesChauffeurs />
            </PrivateRoute>
          }
        />

        <Route
          path="/performances"
          element={
            <PrivateRoute>
              <MesPerformances />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/parametres"
          element={
            <PrivateRoute>
              <ParametresSysteme />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/audit"
          element={
            <PrivateRoute>
              <JournalAudit />
            </PrivateRoute>
          }
        />

        <Route
          path="/assistance"
          element={
            <PrivateRoute>
              <CentreAssistance />
            </PrivateRoute>
          }
        />

        <Route
          path="/assistance/tickets/:id"
          element={
            <PrivateRoute>
              <TicketDetail />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/tickets"
          element={
            <PrivateRoute>
              <AdminTickets />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/faq"
          element={
            <PrivateRoute>
              <AdminFAQ />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/comptabilite"
          element={
            <PrivateRoute>
              <Comptabilite />
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
