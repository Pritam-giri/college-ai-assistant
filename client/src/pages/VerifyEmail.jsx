import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Sparkles, Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function maskEmail(emailStr) {
  if (!emailStr || !emailStr.includes("@")) return emailStr || "";
  const [user, domain] = emailStr.split("@");
  if (user.length <= 2) {
    return `${user.charAt(0)}***@${domain}`;
  }
  return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
}

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendVerification, logout } = useAuth();

  const emailParam = searchParams.get("email") || location.state?.email || "";
  const [email, setEmail] = useState(emailParam);

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    location.state?.message || "We sent a 6-digit verification code to your email."
  );
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef([]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    if (value.length > 1) {
      const digits = value.slice(0, OTP_LENGTH).split("");
      for (let i = 0; i < OTP_LENGTH; i++) {
        newOtp[i] = digits[i] || "";
      }
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, OTP_LENGTH).split("");
    const newOtp = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < digits.length; i++) {
      newOtp[i] = digits[i];
    }
    setOtp(newOtp);
    setError("");
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please provide an email address.");
      return;
    }

    const otpCode = otp.join("");
    if (otpCode.length !== OTP_LENGTH) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const result = await verifyEmail(email.trim(), otpCode);

      // Ensure user is not auto-logged in, redirect to Login screen as required
      logout();

      navigate("/login", {
        state: { message: result?.alreadyVerified ? result.message : "Email verified successfully. You can now log in." },
        replace: true,
      });
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Invalid verification code.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    if (!email.trim()) {
      setError("Please enter your email address to resend OTP.");
      return;
    }

    try {
      setResending(true);
      setError("");
      setMessage("");

      const res = await resendVerification(email.trim());
      setMessage(res?.message || "New verification code sent.");
      setCountdown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to resend code. Please try again.";
      setError(errMsg);
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-background-orb auth-orb-one" />
      <div className="auth-background-orb auth-orb-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <h1>Verify your email</h1>
            <p>We sent a 6-digit verification code to your email.</p>
          </div>
        </div>

        {email && (
          <div className="email-badge-display">
            <Mail size={15} />
            <span>{maskEmail(email)}</span>
          </div>
        )}

        {message && (
          <div className="auth-banner auth-banner-success" role="status">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="auth-form" noValidate>
          {!emailParam && (
            <div className="form-group">
              <label htmlFor="verify-email-input">Email Address</label>
              <div className="input-wrapper">
                <Mail size={17} className="input-icon" />
                <input
                  id="verify-email-input"
                  type="email"
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          )}

          <div className="otp-container">
            <label className="otp-label">Enter 6-Digit Code</label>
            <div className="otp-boxes-grid" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`otp-box ${digit ? "otp-box-filled" : ""}`}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || otp.join("").length !== OTP_LENGTH}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div className="auth-footer-actions">
          <button
            type="button"
            className="resend-otp-button"
            onClick={handleResend}
            disabled={countdown > 0 || resending}
          >
            <RefreshCw size={14} className={resending ? "spin" : ""} />
            {resending
              ? "Sending Code..."
              : countdown > 0
              ? `Resend OTP in ${countdown}s`
              : "Resend OTP"}
          </button>

          <div className="auth-switch-prompt" style={{ marginTop: 12 }}>
            <Link to="/login" className="back-to-login-link">
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default VerifyEmail;
