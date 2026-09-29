// routes/auth.routes.js

const express = require('express');

const {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const codeCheckLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const codeSendLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

// Student registration
router.post('/register', codeSendLimiter, register);

// Email Verification
router.post('/verify-email', codeCheckLimiter, verifyEmail);
router.post('/resend-verification', codeSendLimiter, resendVerification);

// Login for provisioned account roles (student, teacher, or admin)
router.post('/login', loginLimiter, login);

// Password Reset Flow
router.post('/forgot-password', codeSendLimiter, forgotPassword);
router.post('/verify-reset-otp', codeCheckLimiter, verifyResetOtp);
router.post('/reset-password', codeCheckLimiter, resetPassword);
router.post('/logout', protect, logout);

module.exports = router;
