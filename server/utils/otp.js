const crypto = require('crypto');

/**
 * Generates a cryptographically secure 6-digit numeric OTP string.
 */
function generateOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

function getOtpKey() {
  const secret = process.env.OTP_PEPPER || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('OTP_PEPPER or JWT_SECRET must be configured before OTP use.');
  }
  return crypto.createHmac('sha256', secret).update('college-ai-assistant:otp:v1').digest();
}

/** HMAC prevents offline recovery of the small OTP search space from a DB dump. */
function hashOTP(otp) {
  if (!otp) return null;
  return crypto.createHmac('sha256', getOtpKey()).update(String(otp).trim()).digest('hex');
}

/** Safely compares a six-digit OTP with a stored HMAC digest. */
function verifyOTP(otp, hashedOtp) {
  if (!/^\d{6}$/.test(String(otp || '').trim()) || !/^[a-f0-9]{64}$/i.test(String(hashedOtp || ''))) return false;
  const computedHash = hashOTP(otp);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(hashedOtp, 'hex')
  );
}

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
};
