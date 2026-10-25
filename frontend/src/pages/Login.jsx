import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../contexts/authState";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.code === "auth/invalid-credential") {
        setError("Incorrect email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Unable to log in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <Link to="/" className="auth-logo">
          <span className="auth-logo-mark">N</span>
          NETSCOPE<span className="auth-logo-dot">.</span>
        </Link>

        <div className="auth-card">
          <span className="auth-eyebrow">WELCOME BACK TO NETSCOPE</span>

          <h1>
            Log in to your workspace<span>.</span>
          </h1>

          <p className="auth-description">
            Continue investigating network incidents and finding root causes
            with clarity.
          </p>

          <button
            type="button"
            className="auth-google-button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <span className="auth-google-icon">G</span>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          <form onSubmit={handleLogin}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in →"}
            </button>
          </form>

          <p className="auth-switch">
            New to NETSCOPE? <Link to="/signup">Create an account</Link>
          </p>
        </div>

        <p className="auth-footer">
          © NETSCOPE · Evidence-based network intelligence
        </p>
      </div>
    </main>
  );
}
