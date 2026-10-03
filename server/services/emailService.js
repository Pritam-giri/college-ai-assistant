const EMAIL_API_URL = 'https://api.resend.com/emails';
const EMAIL_API_TIMEOUT_MS = 12000;

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const missing = [];

  if (!apiKey) missing.push('RESEND_API_KEY');
  if (!from) missing.push('EMAIL_FROM');
  if (missing.length) {
    throw new Error(`Email API configuration is missing required environment variables: ${missing.join(', ')}`);
  }

  return { apiKey, from };
}

function validateEmailConfig() {
  const config = getEmailConfig();
  console.info('Email API configuration', {
    provider: 'Resend',
    endpoint: EMAIL_API_URL,
    apiKeyPresent: Boolean(config.apiKey),
    senderAddressPresent: Boolean(config.from),
  });
}

function renderEmailTemplate({ title, greetingName, introText, instructionText, otp, footerNote }) {
  const greeting = greetingName ? `Hello ${greetingName},` : 'Hello,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; text-align: left;">
        <tr><td style="padding: 24px 32px 20px; border-bottom: 2px solid #0f172a;">
          <h1 style="margin: 0; font-size: 18px; color: #0f172a;">Government Polytechnic Unnao</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #475569;">College AI Assistant</p>
        </td></tr>
        <tr><td style="padding: 28px 32px;">
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #0f172a;">${greeting}</p>
          ${introText ? `<p style="margin: 0 0 14px; font-size: 15px; line-height: 1.6; color: #334155;">${introText}</p>` : ''}
          <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #334155;">${instructionText}</p>
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px;">
            <tr><td style="padding: 20px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; margin-bottom: 8px;">VERIFICATION CODE</div>
              <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e3a8a; font-family: 'Courier New', Courier, monospace; padding-left: 8px;">${otp}</div>
            </td></tr>
          </table>
          <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #475569;">This code is valid for 10 minutes.</p>
          ${footerNote ? `<p style="margin: 0 0 24px; font-size: 13px; line-height: 1.5; color: #64748b;">${footerNote}</p>` : ''}
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 14px; line-height: 1.6; color: #334155;">Regards,<br><strong>College AI Assistant</strong><br>Government Polytechnic Unnao</div>
        </td></tr>
        <tr><td style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">This is an automated email. Please do not reply to this message.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText({ greetingName, introText, instructionText, otp, footerNote }) {
  return [
    greetingName ? `Hello ${greetingName},` : 'Hello,',
    introText,
    instructionText,
    `VERIFICATION CODE: ${otp}`,
    'This code is valid for 10 minutes.',
    footerNote,
    'Regards, College AI Assistant, Government Polytechnic Unnao',
  ].filter(Boolean).join('\n\n');
}

async function sendEmail({ email, name, otp, subject, introText, instructionText, footerNote }) {
  const { apiKey, from } = getEmailConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_API_TIMEOUT_MS);

  try {
    const response = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        html: renderEmailTemplate({ title: subject, greetingName: name, introText, instructionText, otp, footerNote }),
        text: renderText({ greetingName: name, introText, instructionText, otp, footerNote }),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Email provider returned HTTP ${response.status}.`);
      error.code = 'EMAIL_API_FAILURE';
      throw error;
    }

    return response.json();
  } catch (err) {
    if (err?.code === 'EMAIL_API_FAILURE') throw err;
    if (err?.name === 'AbortError') {
      const error = new Error(`Email provider request timed out after ${EMAIL_API_TIMEOUT_MS} ms.`);
      error.code = 'EMAIL_API_TIMEOUT';
      throw error;
    }
    const error = new Error('Unable to connect to the email provider.');
    error.code = 'EMAIL_API_CONNECTION';
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function sendVerificationEmail({ email, name, otp }) {
  return sendEmail({
    email,
    name,
    otp,
    subject: 'Government Polytechnic Unnao - Verify Your Email',
    introText: 'Thank you for registering for College AI Assistant.',
    instructionText: 'To complete your registration, enter the verification code below:',
    footerNote: 'If you did not create this account, you can safely ignore this email.',
  });
}

function sendPasswordResetEmail({ email, name, otp }) {
  return sendEmail({
    email,
    name,
    otp,
    subject: 'Government Polytechnic Unnao - Password Reset Verification',
    introText: 'A password reset request was made for your College AI Assistant account.',
    instructionText: 'Use the verification code below to continue:',
    footerNote: 'If you did not request a password reset, you can safely ignore this email.',
  });
}

module.exports = {
  validateEmailConfig,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
