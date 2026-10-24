import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../contexts/AuthContext";
import { saveInvestigation } from "../services/investigations";

export default function SaveInvestigation({ scenario }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!currentUser) {
      navigate("/login", {
        state: { from: { pathname: "/demo" } },
      });
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveInvestigation(currentUser, scenario);
      setSaved(true);
    } catch (err) {
      console.error("Save investigation failed:", err);
      setError(`Save failed: ${err.code || err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="save-investigation">
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || saved || !scenario}
        style={{
          background: saved ? "#e7f3ec" : "#f16d4e",
          color: saved ? "#32805a" : "#ffffff",
          border: "none",
          borderRadius: "10px",
          padding: "12px 18px",
          fontSize: "12px",
          fontWeight: 750,
          cursor: saving || saved ? "default" : "pointer",
        }}
      >
        {saving
          ? "Saving..."
          : saved
            ? "✓ Investigation saved"
            : "Save investigation ↗"}
      </button>

      {error && (
        <p role="alert" style={{ color: "#b13f2d", fontSize: "12px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
