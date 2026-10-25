import { BrowserRouter, Routes, Route, Navigate } from "react-router";

import Landing from "./pages/Landing";
import DemoDashboard from "./DemoDashboard";

import Signup from "./pages/Signup";
import Login from "./pages/Login";

import UserDashboard from "./pages/UserDashboard";
import Investigations from "./pages/Investigations";
import InvestigationDetails from "./pages/InvestigationDetails";

import ProtectedRoute from "./components/ProtectedRoute";

import "./styles/Auth.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/demo" element={<DemoDashboard />} />

        <Route path="/signup" element={<Signup />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/dashboard/investigations" element={<ProtectedRoute><Investigations /></ProtectedRoute>} />

        <Route
          path="/dashboard/investigations/:investigationId"
          element={
            <ProtectedRoute>
              <InvestigationDetails />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
