import { Navigate, useLocation } from "react-router";
import { useAuth } from "../contexts/authState";

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p role="status">Checking your session…</p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
