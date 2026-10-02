import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import CollegeLogo from "../components/CollegeLogo";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState(location.state?.message || "");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
    if (unverifiedEmail) {
      setUnverifiedEmail("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setUnverifiedEmail("");
      setSuccessMessage("");

      const result = await login(form.email.trim(), form.password);

      if (result?.requiresVerification) {
        setUnverifiedEmail(result.email || form.email.trim());
        setError(result.message || "Please verify your email address before logging in.");
        return;
      }

      const requestedLocation = location.state?.from;
      const requestedPath = requestedLocation
        ? `${requestedLocation.pathname || "/chatbot"}${requestedLocation.search || ""}`
        : null;
      const defaultPath = result?.user?.role === "admin" ? "/admin" : "/chatbot";
      navigate(requestedPath || defaultPath, { replace: true });
    } catch (err) {
      if (err.response?.data?.requiresEmailVerification) {
        setUnverifiedEmail(err.response.data.email || form.email.trim());
        setError(err.response.data.message || "Please verify your email address before logging in.");
      } else {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Login failed. Please check your credentials.";

        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <CollegeLogo className="college-mark--login" />

          <div>
            <h1>College Chatbot</h1>
            <p>Government Polytechnic Unnao</p>
          </div>
        </div>

        <div className="auth-heading">
          <h2>Welcome back</h2>
          <p>Sign in to continue to your college assistant.</p>
        </div>

        {successMessage && (
          <div className="auth-banner auth-banner-success" role="status" style={{ marginBottom: 16 }}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="auth-error" role="alert">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
            {unverifiedEmail && (
              <button
                type="button"
                className="verify-now-btn"
                onClick={() =>
                  navigate(`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`, {
                    state: { email: unverifiedEmail },
                  })
                }
              >
                Verify Email Now <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email address</label>

            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />

              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="password-label-row">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot password?
              </Link>
            </div>

            <div className="input-wrapper">
              <LockKeyhole size={18} className="input-icon" />

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create an account</Link>
        </p>

        <p className="auth-footer">
          Your college information, timetable, notices and AI assistance - all in one place.
        </p>

        <div className="auth-legal-row">
          <Link className="institutional-legal-link" to="/privacy-policy">Privacy Policy</Link>
          <span className="auth-legal-sep">&bull;</span>
          <Link className="institutional-legal-link" to="/terms-and-conditions">Terms &amp; Conditions</Link>
        </div>
      </section>
    </main>
  );
}
