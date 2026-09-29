import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

const PASSWORD_RULES = {
  length: (p) => p.length >= 8,
  uppercase: (p) => /[A-Z]/.test(p),
  lowercase: (p) => /[a-z]/.test(p),
  number: (p) => /\d/.test(p),
  special: (p) => /[^A-Za-z0-9]/.test(p),
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword, verifyResetOtp, resetPassword } = useAuth();

  // Step state: 1 = Email, 2 = Verify OTP, 3 = New Password, 4 = Complete
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [countdown, setCountdown] = useState(0);

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

  const passwordChecks = {
    length: PASSWORD_RULES.length(newPassword),
    uppercase: PASSWORD_RULES.uppercase(newPassword),
    lowercase: PASSWORD_RULES.lowercase(newPassword),
    number: PASSWORD_RULES.number(newPassword),
    special: PASSWORD_RULES.special(newPassword),
  };
  const passwordStrong = Object.values(passwordChecks).every(Boolean);

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
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, OTP_LENGTH).split("");
    const newOtpArr = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < digits.length; i++) {
      newOtpArr[i] = digits[i];
    }
    setOtp(newOtpArr);
    setError("");
  };

  // STEP 1: Send Reset OTP Email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      setAccountNotFound(false);
      const res = await forgotPassword(email.trim());
      setMessage(res?.message || "Password reset code sent to your email.");
      setStep(2);
      setCountdown(RESEND_COOLDOWN);
    } catch (err) {
      const notFound = err.response?.status === 404;
      setAccountNotFound(notFound);
      if (notFound) setStep(1);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Unable to send reset code. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify Reset OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== OTP_LENGTH) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await verifyResetOtp(email.trim(), otpCode);
      setMessage(res?.message || "Verification code confirmed. Enter your new password.");
      setStep(3);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Invalid reset code. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!passwordStrong) {
      setError("Please ensure your new password satisfies all strength requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const otpCode = otp.join("");
      const res = await resetPassword(email.trim(), otpCode, newPassword);
      setMessage(res?.message || "Your password has been updated successfully.");
      setStep(4);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to reset password. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    try {
      setResending(true);
      setError("");
      setMessage("");

      const res = await forgotPassword(email.trim());
      setMessage(res?.message || "A new reset code has been sent to your email.");
      setCountdown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(""));
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to resend code. Please try again.";
      if (err.response?.status === 404) {
        setStep(1);
        setOtp(Array(OTP_LENGTH).fill(""));
        setAccountNotFound(true);
      }
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
            <KeyRound size={20} />
          </div>
          <div>
            <h1>Forgot Password</h1>
            <p>
              {step === 1 && "Enter your email to receive a password reset code."}
              {step === 2 && "Enter the 6-digit code sent to your email."}
              {step === 3 && "Create a new strong password for your account."}
              {step === 4 && "Password reset complete!"}
            </p>
          </div>
        </div>

        {message && (
          <div className="auth-banner auth-banner-success" role="status">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {accountNotFound && (
          <div className="auth-switch-prompt" style={{ marginTop: 12 }}>
            <Link to="/register" className="back-to-login-link">
              Register
            </Link>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="reset-email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={17} className="input-icon" />
                <input
                  id="reset-email"
                  type="email"
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                    setAccountNotFound(false);
                  }}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Sending Code..." : "Send Verification Code"}
            </button>
          </form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="auth-form" noValidate>
            <div className="otp-container">
              <label className="otp-label">Enter 6-Digit Reset Code</label>
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
              {loading ? "Verifying..." : "Verify Reset Code"}
            </button>

            <div style={{ marginTop: 12, textAlign: "center" }}>
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
                  ? `Resend Code in ${countdown}s`
                  : "Resend Code"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Enter New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <div className="input-wrapper">
                <LockKeyhole size={17} className="input-icon" />
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              <label htmlFor="confirm-new-password">Confirm New Password</label>
              <div className="input-wrapper">
                <LockKeyhole size={17} className="input-icon" />
                <input
                  id="confirm-new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || !passwordStrong || newPassword !== confirmPassword}
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        )}

        {/* STEP 4: Success / Log In Now */}
        {step === 4 && (
          <div style={{ textCenter: "center", marginTop: 16 }}>
            <button
              type="button"
              className="auth-submit"
              onClick={() => navigate("/login")}
            >
              Log In Now
            </button>
          </div>
        )}

        <div className="auth-switch-prompt" style={{ marginTop: 20 }}>
          <Link to="/login" className="back-to-login-link">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;
