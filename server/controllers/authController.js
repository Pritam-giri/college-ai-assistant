const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const departmentService = require('../services/departmentService');
const { signToken } = require('../utils/jwt');
const { generateOTP, hashOTP, verifyOTP } = require('../utils/otp');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PASSWORD_RULES = {
  length: (password) => password.length >= 8,
  bcryptLength: (password) => Buffer.byteLength(password, 'utf8') <= 72,
  uppercase: (password) => /[A-Z]/.test(password),
  lowercase: (password) => /[a-z]/.test(password),
  number: (password) => /\d/.test(password),
  special: (password) => /[^A-Za-z0-9]/.test(password),
};

function isStrongPassword(password) {
  return Object.values(PASSWORD_RULES).every((rule) => rule(password));
}

function requireText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new ApiError(400, `${field} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function requireOtp(value) {
  if (typeof value !== 'string' || !/^\d{6}$/.test(value.trim())) {
    throw new ApiError(400, 'Code must contain exactly 6 digits.');
  }
  return value.trim();
}

function signUserToken(user) {
  return signToken({
    id: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion || 0,
  });
}

/**
 * LOGIN CONTROLLER
 * Validates credentials and checks email verification status.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const normalizedEmail = requireText(email, 'Email', 254).toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password +tokenVersion');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.active) {
    throw new ApiError(403, 'Your account is currently inactive.');
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Check email verification status
  if (!user.isEmailVerified) {
    const error = new ApiError(
      403,
      'Please verify your email address before logging in.'
    );
    error.requiresEmailVerification = true;
    error.email = user.email;
    throw error;
  }

  const token = signUserToken(user);

  res.status(200).json({
    success: true,
    data: {
      token,
      user,
    },
  });
});

/**
 * REGISTER CONTROLLER
 * Creates account (or updates unverified account) and sends verification OTP.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, rollNumber, department, semester } = req.body;

  if (
    !name ||
    !email ||
    !password ||
    !rollNumber ||
    !department ||
    semester === undefined ||
    semester === null
  ) {
    throw new ApiError(400, 'All student fields are required.');
  }

  requireText(name, 'Name', 100);
  requireText(email, 'Email', 254);
  requireText(password, 'Password', 72);
  requireText(rollNumber, 'Roll number', 50);
  requireText(department, 'Department', 50);

  const normalizedEmail = requireText(email, 'Email', 254).toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }

  if (!isStrongPassword(String(password))) {
    throw new ApiError(
      400,
      'Password must contain 8 to 72 UTF-8 bytes, including uppercase, lowercase, number, and special characters.'
    );
  }

  const semesterNumber = Number(semester);
  if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 6) {
    throw new ApiError(400, 'Semester must be between 1 and 6.');
  }

  const normalizedDepartment = department.trim().toUpperCase();
  if (!(await departmentService.isValidDepartment(normalizedDepartment))) {
    throw new ApiError(400, 'Choose an active college department.');
  }

  let existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser && existingUser.isEmailVerified) {
    throw new ApiError(409, 'Email is already registered. Please log in.');
  }

  const otp = generateOTP();
  const hashedOtp = hashOTP(otp);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  let user;
  let previousUnverifiedState;

  if (existingUser && !existingUser.isEmailVerified) {
    // Update existing unverified registration with new credentials
    previousUnverifiedState = {
      name: existingUser.name,
      rollNumber: existingUser.rollNumber,
      department: existingUser.department,
      semester: existingUser.semester,
      verificationOtpHash: existingUser.verificationOtpHash,
      verificationOtpExpiresAt: existingUser.verificationOtpExpiresAt,
      verificationOtpAttempts: existingUser.verificationOtpAttempts,
      verificationOtpLastSentAt: existingUser.verificationOtpLastSentAt,
    };
    existingUser.name = String(name).trim();
    existingUser.rollNumber = String(rollNumber).trim();
    existingUser.department = normalizedDepartment;
    existingUser.semester = semesterNumber;
    existingUser.verificationOtpHash = hashedOtp;
    existingUser.verificationOtpExpiresAt = otpExpiresAt;
    existingUser.verificationOtpAttempts = 0;
    existingUser.verificationOtpLastSentAt = new Date();

    user = await existingUser.save();
  } else {
    // Create new user account
    user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
      role: 'student',
      active: true,
      rollNumber: String(rollNumber).trim(),
      department: normalizedDepartment,
      semester: semesterNumber,
      isEmailVerified: false,
      verificationOtpHash: hashedOtp,
      verificationOtpExpiresAt: otpExpiresAt,
      verificationOtpAttempts: 0,
      verificationOtpLastSentAt: new Date(),
    });
  }

  // Send verification email
  try {
    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      otp,
    });
  } catch (emailErr) {
    console.error('Failed to send verification email', {
      code: emailErr?.code || 'unknown',
      message: emailErr?.message || 'Email transport failed',
    });
    if (previousUnverifiedState) {
      Object.assign(user, previousUnverifiedState);
      await user.save();
    } else {
      await user.deleteOne();
    }
    throw new ApiError(
      500,
      'Unable to send the verification email right now. Please try registering again shortly.'
    );
  }

  if (existingUser && !existingUser.isEmailVerified) {
    // Update the password only after delivery, so a failed send preserves the
    // prior login credentials for this unverified account.
    user.password = String(password);
    await user.save();
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful. A 6-digit verification code has been sent to your email.',
    email: user.email,
    requiresEmailVerification: true,
  });
});

/**
 * VERIFY EMAIL OTP
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, 'Email and verification code are required.');
  }

  requireOtp(otp);

  const normalizedEmail = requireText(email, 'Email', 254).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+tokenVersion');

  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  if (user.isEmailVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified. Please log in.',
      alreadyVerified: true,
    });
  }

  if (!user.verificationOtpHash || !user.verificationOtpExpiresAt) {
    throw new ApiError(400, 'No verification code found. Please request a new code.');
  }

  if (new Date() > new Date(user.verificationOtpExpiresAt)) {
    throw new ApiError(400, 'Verification code has expired. Please request a new code.');
  }

  if (user.verificationOtpAttempts >= 5) {
    throw new ApiError(
      400,
      'Maximum verification attempts exceeded. Please request a new code.'
    );
  }

  const isValid = verifyOTP(String(otp).trim(), user.verificationOtpHash);

  if (!isValid) {
    user.verificationOtpAttempts += 1;
    await user.save();
    throw new ApiError(400, 'Invalid verification code. Please check and try again.');
  }

  // Mark verified & clear OTP
  user.isEmailVerified = true;
  user.verificationOtpHash = null;
  user.verificationOtpExpiresAt = null;
  user.verificationOtpAttempts = 0;
  user.verificationOtpLastSentAt = null;

  await user.save();

  const token = signUserToken(user);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully.',
    data: {
      token,
      user,
    },
  });
});

/**
 * RESEND VERIFICATION OTP
 */
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email address is required.');
  }

  const normalizedEmail = requireText(email, 'Email', 254).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'Your email is already verified. Please log in.');
  }

  // 60-second cooldown check
  if (user.verificationOtpLastSentAt) {
    const elapsed = Date.now() - new Date(user.verificationOtpLastSentAt).getTime();
    if (elapsed < 60 * 1000) {
      const remaining = Math.ceil((60 * 1000 - elapsed) / 1000);
      throw new ApiError(
        429,
        `Please wait ${remaining} second${remaining === 1 ? '' : 's'} before requesting another code.`
      );
    }
  }

  const otp = generateOTP();
  const hashedOtp = hashOTP(otp);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  user.verificationOtpHash = hashedOtp;
  user.verificationOtpExpiresAt = otpExpiresAt;
  user.verificationOtpAttempts = 0;
  user.verificationOtpLastSentAt = new Date();

  await user.save();

  try {
    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      otp,
    });
  } catch (emailErr) {
    console.error('Failed to resend verification email', {
      code: emailErr?.code || 'unknown',
      message: emailErr?.message || 'Email transport failed',
    });
    throw new ApiError(500, 'Failed to send verification email. Please try again.');
  }

  res.status(200).json({
    success: true,
    message: 'A new 6-digit verification code has been sent to your email.',
  });
});

/**
 * FORGOT PASSWORD - REQUEST RESET OTP
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email address is required.');
  }

  const normalizedEmail = requireText(email, 'Email', 254).toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new ApiError(404, 'No account found with this email. Please register first.');
  }

  // 60-second cooldown check
  if (user.resetOtpLastSentAt) {
    const elapsed = Date.now() - new Date(user.resetOtpLastSentAt).getTime();
    if (elapsed < 60 * 1000) {
      const remaining = Math.ceil((60 * 1000 - elapsed) / 1000);
      throw new ApiError(
        429,
        `Please wait ${remaining} second${remaining === 1 ? '' : 's'} before requesting another reset code.`
      );
    }
  }

  const otp = generateOTP();
  const hashedOtp = hashOTP(otp);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  user.resetOtpHash = hashedOtp;
  user.resetOtpExpiresAt = otpExpiresAt;
  user.resetOtpAttempts = 0;
  user.resetOtpLastSentAt = new Date();

  await user.save();

  try {
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      otp,
    });
  } catch (emailErr) {
    console.error('Failed to send password reset email', { code: emailErr?.code || 'unknown' });
    throw new ApiError(500, 'Failed to send password reset email. Please try again.');
  }

  res.status(200).json({
    success: true,
    message: 'If an account exists with this email, a 6-digit password reset code has been sent.',
  });
});

/**
 * VERIFY RESET OTP
 */
const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, 'Email and reset code are required.');
  }

  requireOtp(otp);

  const normalizedEmail = requireText(email, 'Email', 254).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
    throw new ApiError(400, 'Invalid or expired password reset request.');
  }

  if (new Date() > new Date(user.resetOtpExpiresAt)) {
    throw new ApiError(400, 'Reset code has expired. Please request a new code.');
  }

  if (user.resetOtpAttempts >= 5) {
    throw new ApiError(400, 'Maximum reset attempts exceeded. Please request a new code.');
  }

  const isValid = verifyOTP(String(otp).trim(), user.resetOtpHash);

  if (!isValid) {
    user.resetOtpAttempts += 1;
    await user.save();
    throw new ApiError(400, 'Invalid reset code. Please check and try again.');
  }

  res.status(200).json({
    success: true,
    message: 'Reset code verified successfully.',
  });
});

/**
 * RESET PASSWORD WITH OTP
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(400, 'Email, reset code, and new password are required.');
  }

  requireOtp(otp);
  requireText(email, 'Email', 254);
  if (typeof newPassword !== 'string') throw new ApiError(400, 'New password must be a string.');

  if (!isStrongPassword(String(newPassword))) {
    throw new ApiError(
      400,
      'New password must contain 8 to 72 UTF-8 bytes, including uppercase, lowercase, number, and special characters.'
    );
  }

  const normalizedEmail = requireText(email, 'Email', 254).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+tokenVersion');

  if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
    throw new ApiError(400, 'Invalid or expired password reset request.');
  }

  if (new Date() > new Date(user.resetOtpExpiresAt)) {
    throw new ApiError(400, 'Reset code has expired. Please request a new code.');
  }

  if (user.resetOtpAttempts >= 5) {
    throw new ApiError(400, 'Maximum reset attempts exceeded. Please request a new code.');
  }

  const isValid = verifyOTP(String(otp).trim(), user.resetOtpHash);

  if (!isValid) {
    user.resetOtpAttempts += 1;
    await user.save();
    throw new ApiError(400, 'Invalid reset code. Please check and try again.');
  }

  // Set new password (bcrypt pre-save hook will hash it)
  user.password = String(newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.resetOtpHash = null;
  user.resetOtpExpiresAt = null;
  user.resetOtpAttempts = 0;
  user.resetOtpLastSentAt = null;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully. You can now log in with your new password.',
  });
});

module.exports = {
  login,
  register,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  logout: asyncHandler(async (req, res) => {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    res.status(200).json({ success: true, message: 'Signed out successfully.' });
  }),
};
