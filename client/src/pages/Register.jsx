import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
  Hash,
  GraduationCap,
  Layers,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const PASSWORD_RULES = {
  length: (password) => password.length >= 8,
  uppercase: (password) => /[A-Z]/.test(password),
  lowercase: (password) => /[a-z]/.test(password),
  number: (password) => /\d/.test(password),
  special: (password) => /[^A-Za-z0-9]/.test(password),
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    rollNumber: "",
    department: "CSE",
    semester: "1",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordChecks = useMemo(
    () => ({
      length: PASSWORD_RULES.length(form.password),
      uppercase: PASSWORD_RULES.uppercase(form.password),
      lowercase: PASSWORD_RULES.lowercase(form.password),
      number: PASSWORD_RULES.number(form.password),
      special: PASSWORD_RULES.special(form.password),
    }),
    [form.password]
  );

  const passwordStrong = Object.values(passwordChecks).every(Boolean);
  const emailValid = form.email.length === 0 || EMAIL_REGEX.test(form.email);
  const passwordsMatch = form.confirmPassword.length === 0 || form.password === form.confirmPassword;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword ||
      !form.rollNumber.trim() ||
      !form.department ||
      !form.semester
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!EMAIL_REGEX.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!passwordStrong) {
      setError("Please create a stronger password using all requirements.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        rollNumber: form.rollNumber.trim(),
        department: form.department,
        semester: Number(form.semester),
      });

      if (result?.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`, {
          state: { email: form.email.trim().toLowerCase(), message: result.message },
          replace: true,
        });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Registration failed. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page register-page">
      <section className="auth-card register-card">
        <div className="auth-brand">
          <div className="brand-icon">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1>College AI Assistant</h1>
            <p>Student Registration</p>
          </div>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Row 1: Name & Roll Number */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <div className="input-wrapper">
                <User size={17} className="input-icon" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="rollNumber">Roll Number</label>
              <div className="input-wrapper">
                <Hash size={17} className="input-icon" />
                <input
                  id="rollNumber"
                  name="rollNumber"
                  type="text"
                  placeholder="CSE-001"
                  value={form.rollNumber}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div
              className={`input-wrapper ${
                form.email && !emailValid ? "input-invalid" : ""
              }`}
            >
              <Mail size={17} className="input-icon" />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="student@college.edu"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Row 2: Password & Confirm Password */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <LockKeyhole size={17} className="input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div
                className={`input-wrapper ${
                  form.confirmPassword && !passwordsMatch ? "input-invalid" : ""
                }`}
              >
                <LockKeyhole size={17} className="input-icon" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Password Requirements Compact Grid */}
          <div className="password-requirements-compact">
            <PasswordRule valid={passwordChecks.length} text="8+ chars" />
            <PasswordRule valid={passwordChecks.uppercase} text="ABC (Uppercase)" />
            <PasswordRule valid={passwordChecks.lowercase} text="abc (Lowercase)" />
            <PasswordRule valid={passwordChecks.number} text="123 (Number)" />
            <PasswordRule valid={passwordChecks.special} text="!@# (Special)" />
          </div>

          {/* Row 3: Academic Details (Department, Semester) */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <div className="input-wrapper">
                <GraduationCap size={17} className="input-icon" />
                <select
                  id="department"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="CSE">CSE</option>
                  <option value="ELECTRONICS">Electronics</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="semester">Semester</label>
              <div className="input-wrapper">
                <Layers size={17} className="input-icon" />
                <select
                  id="semester"
                  name="semester"
                  value={form.semester}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="1">Sem 1</option>
                  <option value="2">Sem 2</option>
                  <option value="3">Sem 3</option>
                  <option value="4">Sem 4</option>
                  <option value="5">Sem 5</option>
                  <option value="6">Sem 6</option>
                </select>
              </div>
            </div>
          </div>

          <div className="auth-terms-notice">
            <ShieldCheck size={16} className="auth-terms-icon" />
            <p>
              By registering, you agree to our{" "}
              <Link to="/terms-and-conditions" className="institutional-legal-link">
                Terms &amp; Conditions
              </Link>{" "}
              and acknowledge our{" "}
              <Link to="/privacy-policy" className="institutional-legal-link">
                Privacy Policy
              </Link>.
            </p>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Sending Verification Code..." : "Create Account"}
          </button>
        </form>

        <div className="auth-bottom-row">
          <span>Already have an account?</span>
          <Link to="/login" className="auth-bottom-login-link">
            Log in now
          </Link>
        </div>

      </section>
    </main>
  );
}

function PasswordRule({ valid, text }) {
  return (
    <div className={`password-rule-badge ${valid ? "valid" : "invalid"}`}>
      {valid ? <Check size={12} /> : <X size={12} />}
      <span>{text}</span>
    </div>
  );
}
