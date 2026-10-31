import { lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";

const Landing = lazy(() => import("./pages/Landing"));
const DemoDashboard = lazy(() => import("./DemoDashboard"));

const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));

const FaultInvestigation = lazy(() => import("./pages/FaultInvestigation"));
const LiveMonitoring = lazy(() => import("./pages/LiveMonitoring"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const Investigations = lazy(() => import("./pages/Investigations"));
const InvestigationDetails = lazy(() => import("./pages/InvestigationDetails"));

import ProtectedRoute from "./components/ProtectedRoute";

import RouteBoundary from "./components/RouteBoundary";

import "./styles/Auth.css";

export default function App() {
  return (
    <BrowserRouter>
      <RouteBoundary>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route path="/demo" element={<DemoDashboard />} />

          <Route path="/signup" element={<Signup />} />

          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />

          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/dashboard/investigate" element={<ProtectedRoute><FaultInvestigation /></ProtectedRoute>} />

          <Route path="/dashboard/live" element={<ProtectedRoute><LiveMonitoring /></ProtectedRoute>} />

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
      </RouteBoundary>
    </BrowserRouter>
  );
}
