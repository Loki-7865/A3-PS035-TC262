import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { useAuth } from "../contexts/authState";
import { db } from "../services/firebase";
import "../styles/UserDashboard.css";

export default function UserDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [investigations, setInvestigations] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "Operator";

  const firstName = displayName.split(" ")[0];

  useEffect(() => {
    if (!currentUser?.uid) {
      return;
    }

    const investigationsRef = collection(
      db,
      "users",
      currentUser.uid,
      "investigations",
    );

    const investigationsQuery = query(
      investigationsRef,
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      investigationsQuery,
      (snapshot) => {
        const records = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setInvestigations(records);
        setHistoryLoading(false);
        setHistoryError("");
      },
      (err) => {
        console.error("Firestore read failed:", err);
        setHistoryError("Could not load saved investigations.");
        setHistoryLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  async function handleLogout() {
    setError("");
    setLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  function formatTimestamp(timestamp) {
    if (!timestamp?.toDate) return "Just saved";

    return timestamp.toDate().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <Link to="/" className="workspace-brand">
          <span className="workspace-brand-mark">N</span>
          NETSCOPE<span className="workspace-brand-dot">.</span>
        </Link>

        <div className="workspace-header-actions">
          <Link to="/dashboard/investigations" className="workspace-demo-link">My Investigations</Link>
          <Link to="/demo" className="workspace-demo-link">
            Open Demo
          </Link>

          <button
            className="workspace-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out..." : "Log out ↗"}
          </button>
        </div>
      </header>

      <main className="workspace-main">
        <div className="workspace-intro">
          <div className="workspace-eyebrow">
            <span className="workspace-live-dot" />
            PERSONAL WORKSPACE
          </div>

          <h1>
            Welcome back, <span>{firstName}.</span>
          </h1>

          <p>
            Your command center for evidence-based network fault investigation.
          </p>
        </div>

        <section className="workspace-overview">
          <div className="workspace-section-top">
            <h2>Workspace overview</h2>
            <span>YOUR NETWORK INTELLIGENCE HUB</span>
          </div>

          <div className="workspace-stat-grid">
            <div className="workspace-stat">
              <span>Saved investigations</span>

              <strong>
                {historyLoading
                  ? "..."
                  : historyError
                    ? "—"
                    : investigations.length}
              </strong>

              <small>
                {historyError || "Investigations stored in your workspace"}
              </small>
            </div>

            <div className="workspace-stat">
              <span>Active monitoring</span>
              <strong className="workspace-muted-stat">Not connected</strong>
              <small>No live network connected yet</small>
            </div>

            <div className="workspace-stat">
              <span>Demo scenarios</span>
              <strong>04</strong>
              <small>Ready to explore</small>
            </div>
          </div>
        </section>

        <section className="workspace-content-grid">
          <div className="workspace-feature-card">
            <div className="workspace-feature-icon">↗</div>

            <div className="workspace-feature-label">
              INTERACTIVE NETWORK LAB
            </div>

            <h2>Investigate a network failure.</h2>

            <p>
              Explore predefined network incidents, inspect evidence, and
              visualize likely root causes.
            </p>

            <Link to="/demo" className="workspace-launch">
              Launch demo <span>↗</span>
            </Link>

            <div className="workspace-feature-footer">
              4 simulated scenarios · No live connection required
            </div>
          </div>

          <div className="workspace-side-stack">
            <div className="workspace-profile-card">
              <div className="workspace-card-label">YOUR ACCOUNT</div>

              <div className="workspace-profile-row">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="workspace-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="workspace-avatar-fallback">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <strong>{displayName}</strong>
                  <span>{currentUser?.email || "No email"}</span>
                </div>
              </div>

              <div className="workspace-account-status">
                <span className="workspace-status-indicator" />
                Authenticated with Firebase
              </div>
            </div>

            <div className="workspace-history-card">
              <div className="workspace-card-label">RECENT INVESTIGATIONS</div>
              <Link to="/dashboard/investigations">View all investigations →</Link>

              {historyLoading ? (
                <p style={{ marginTop: 28 }}>Loading your investigations...</p>
              ) : historyError ? (
                <p role="alert" style={{ marginTop: 28 }}>
                  {historyError}
                </p>
              ) : investigations.length === 0 ? (
                <>
                  <div className="workspace-empty-icon">◎</div>
                  <h3>No investigations yet.</h3>
                  <p>Save a demo scenario to see it here.</p>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    marginTop: 24,
                    textAlign: "left",
                  }}
                >
                  {investigations.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      to={`/dashboard/investigations/${item.id}`}
                      style={{
                        display: "block",
                        padding: 15,
                        background: "#f8f6f1",
                        border: "1px solid #eae6de",
                        borderRadius: 12,
                        textDecoration: "none",
                        color: "inherit",
                        transition: "border-color 0.2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 13,
                            color: "#292b29",
                          }}
                        >
                          {item.title || "Untitled investigation"}
                        </strong>

                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#e86b4d",
                          }}
                        >
                          {item.source === "demo" ? "DEMO" : item.source === "live" ? "LIVE" : "UNKNOWN"}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: 11,
                          color: "#8b8a83",
                        }}
                      >
                        {formatTimestamp(item.createdAt)}
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          fontSize: 11,
                          color: "#8b8a83",
                        }}
                      >
                        Scenario: {item.scenarioId || "Unknown"}
                      </p>
                    </Link>
                  ))}

                  {investigations.length > 5 && (
                    <p>
                      Showing 5 of {investigations.length} saved investigations.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {error && (
          <p className="workspace-error" role="alert">
            {error}
          </p>
        )}
      </main>

      <footer className="workspace-footer">
        <span>NETSCOPE © 2026</span>
        <span>Evidence-based network intelligence</span>
      </footer>
    </div>
  );
}
