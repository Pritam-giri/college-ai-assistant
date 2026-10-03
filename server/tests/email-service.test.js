const assert = require('node:assert/strict');
const test = require('node:test');

const emailService = require('../services/emailService');

const originalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
};

function configureEmail() {
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.EMAIL_FROM = 'College Assistant <verified@example.test>';
}

test.after(() => {
  if (originalEnv.RESEND_API_KEY === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
  if (originalEnv.EMAIL_FROM === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = originalEnv.EMAIL_FROM;
});

test('Resend email API sends verification content over HTTPS', async (t) => {
  configureEmail();
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ id: 'email-id' }) };
  };

  const result = await emailService.sendVerificationEmail({
    email: 'student@example.test',
    name: 'Student',
    otp: '123456',
  });

  assert.deepEqual(result, { id: 'email-id' });
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer test-api-key');
  assert.equal(request.options.signal instanceof AbortSignal, true);
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.from, 'College Assistant <verified@example.test>');
  assert.deepEqual(payload.to, ['student@example.test']);
  assert.match(payload.html, /123456/);
  assert.match(payload.text, /123456/);
  assert.match(payload.html, /This code is valid for 10 minutes/);
});

test('Resend provider failures return a clear safe error', async (t) => {
  configureEmail();
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({ ok: false, status: 503 });

  await assert.rejects(
    emailService.sendVerificationEmail({ email: 'student@example.test', name: 'Student', otp: '123456' }),
    (err) => err.code === 'EMAIL_API_FAILURE' && err.message.includes('503') && !err.message.includes('123456')
  );
});

test('Resend API request aborts at its configured timeout', async (t) => {
  configureEmail();
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });

  await assert.rejects(
    emailService.sendVerificationEmail({ email: 'student@example.test', name: 'Student', otp: '123456' }),
    (err) => err.code === 'EMAIL_API_TIMEOUT' && err.message.includes('12000')
  );
});

test('startup validation requires the API key and sender', () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  assert.throws(emailService.validateEmailConfig, /RESEND_API_KEY, EMAIL_FROM/);

  configureEmail();
  assert.doesNotThrow(emailService.validateEmailConfig);
});
