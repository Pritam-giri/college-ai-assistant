const test = require('node:test');
const assert = require('node:assert/strict');

const { validateHttpUrl } = require('../utils/httpUrl');
const { createRateLimiter } = require('../middleware/rateLimit');
const { hashOTP, verifyOTP } = require('../utils/otp');
const User = require('../models/User');

test('file-link URLs accept HTTP(S) and reject executable or credentialed schemes', () => {
  assert.equal(validateHttpUrl('https://college.example/files/handbook.pdf'), 'https://college.example/files/handbook.pdf');
  for (const value of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'https://user:pass@example.com/a']) {
    assert.throws(() => validateHttpUrl(value), { statusCode: 400 });
  }
  assert.throws(() => validateHttpUrl('https://example.com/' + 'a'.repeat(2048)), { statusCode: 400 });
});

test('OTP hashes are keyed, fixed-format, and compared safely', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'security-test-signing-key-that-is-not-a-real-secret';
  try {
    const hash = hashOTP('123456');
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.equal(verifyOTP('123456', hash), true);
    assert.equal(verifyOTP('123457', hash), false);
    assert.equal(verifyOTP('12345', hash), false);
    assert.equal(verifyOTP('abcdef', hash), false);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});

test('rate limiter returns 429 after its configured request count', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
  const makeResponse = () => ({ headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } });
  const req = { ip: 'test-client' };
  const first = makeResponse();
  let nextCalled = false;
  limiter(req, first, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(first.headers['RateLimit-Remaining'], '0');

  const second = makeResponse();
  limiter(req, second, () => { nextCalled = true; });
  assert.equal(second.statusCode, 429);
  assert.ok(Number(second.headers['Retry-After']) > 0);
});

test('user JSON never exposes credentials, OTP state, or token revocation state', () => {
  const user = User.hydrate({
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Student',
    email: 'student@example.com',
    password: 'hashed-password',
    tokenVersion: 4,
    verificationOtpHash: 'verification-hash',
    verificationOtpExpiresAt: new Date(),
    verificationOtpAttempts: 2,
    resetOtpHash: 'reset-hash',
    resetOtpExpiresAt: new Date(),
    resetOtpAttempts: 3,
  });

  const json = user.toJSON();
  for (const field of ['password', 'tokenVersion', 'verificationOtpHash', 'verificationOtpExpiresAt', 'verificationOtpAttempts', 'resetOtpHash', 'resetOtpExpiresAt', 'resetOtpAttempts']) {
    assert.equal(Object.hasOwn(json, field), false, `${field} should not be serialized`);
  }
});
