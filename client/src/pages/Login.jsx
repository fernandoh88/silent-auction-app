import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import styles from "./AuthForm.module.css";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate(isAdmin ? "/admin" : "/");
    }
  }, [currentUser, isAdmin, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Basic validation
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false); // Reset loading state after success
    } catch (err) {
      console.error("Login failed:", err);
      const errorMessage = {
        "auth/invalid-credential": "Invalid email or password",
        "auth/user-disabled": "This account has been disabled",
        "auth/user-not-found": "No account found with this email",
        "auth/wrong-password": "Invalid email or password",
        "auth/too-many-requests": "Too many failed attempts. Please try again later"
      }[err.code] || "Failed to login. Please try again.";
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className={styles["auth-bg"]}>
      <div className={styles["auth-card"]}>
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <h2 className={styles["auth-title"]}>Sign In</h2>
          {error && (
            <div className={styles["auth-error"]}>{error}</div>
          )}
          <div style={{ marginBottom: '1.2rem' }}>
            <label className={styles["auth-label"]} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles["auth-input"]}
              required
              disabled={loading}
            />
          </div>
          <div style={{ marginBottom: '1.2rem' }}>
            <label className={styles["auth-label"]} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles["auth-input"]}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={styles["auth-btn"]}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              type="button"
              className={styles["auth-link"]}
              style={{ background: 'none', border: 'none', color: '#4299e1', cursor: 'pointer', fontSize: '1rem', padding: 0, fontWeight: 600, textDecoration: 'underline' }}
              onClick={() => setShowReset(true)}
            >
              Forgot password?
            </button>
          </div>
          <p className={styles["auth-footer"]}>
            Don't have an account?{' '}
            <Link to="/register" className={styles["auth-link"]}>Register</Link>
          </p>
        </form>

        {/* Password Reset Modal */}
        {showReset && (
          <div className={styles["auth-modal"]}>
            <div className={styles["auth-modal-content"]}>
              <h3 className={styles["auth-title"]}>Reset Password</h3>
              {resetMsg && <div className={styles["auth-success"]}>{resetMsg}</div>}
              <input
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                className={styles["auth-input"]}
                style={{ marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  className={styles["auth-btn"]}
                  onClick={async () => {
                    setResetMsg("");
                    if (!resetEmail || !resetEmail.includes("@")) {
                      setResetMsg("Please enter a valid email address.");
                      return;
                    }
                    try {
                      await sendPasswordResetEmail(auth, resetEmail);
                      setResetMsg("Password reset email sent! Check your inbox.");
                    } catch (err) {
                      setResetMsg("Failed to send reset email. " + (err.message || "Try again later."));
                    }
                  }}
                >
                  Send Reset Email
                </button>
                <button
                  type="button"
                  className={styles["auth-btn"]}
                  style={{ background: '#ccc', color: '#333' }}
                  onClick={() => {
                    setShowReset(false);
                    setResetEmail("");
                    setResetMsg("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
