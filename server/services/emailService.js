const nodemailer = require('nodemailer');

const EMAIL_TIMEOUT_MS = 15000;

function getEmailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const rawPort = process.env.SMTP_PORT?.trim();
  const port = Number(rawPort);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const missing = [];

  if (!host) missing.push('SMTP_HOST');
  if (!rawPort) missing.push('SMTP_PORT');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');

  if (missing.length) {
    throw new Error(`Email configuration is missing required environment variables: ${missing.join(', ')}`);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Email configuration error: SMTP_PORT must be an integer between 1 and 65535.');
  }

  return { host, port, secure: port === 465, user, pass };
}

function validateEmailConfig() {
  const config = getEmailConfig();
  console.info('Email SMTP configuration', {
    provider: config.host === 'smtp.gmail.com' ? 'Gmail SMTP' : 'Custom SMTP',
    host: config.host,
    port: config.port,
    secure: config.secure,
    smtpUserPresent: Boolean(config.user),
    smtpPasswordPresent: Boolean(config.pass),
    fromAddressPresent: Boolean(process.env.SMTP_FROM?.trim()),
  });
}

function createTransporter() {
  const config = getEmailConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS,
    dnsTimeout: EMAIL_TIMEOUT_MS,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

const DEFAULT_FROM =
  process.env.SMTP_FROM || process.env.SMTP_USER;

/**
 * Clean institutional email template for Government Polytechnic Unnao.
 * Follows strict academic email design principles without emojis, gradients, or marketing hype.
 */
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
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; text-align: left;">
          
          <!-- Institutional Header -->
          <tr>
            <td style="padding: 24px 32px 20px 32px; border-bottom: 2px solid #0f172a; background-color: #ffffff;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                Government Polytechnic Unnao
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569; font-weight: 500;">
                College AI Assistant
              </p>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 28px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #0f172a;">
                ${greeting}
              </p>

              ${introText ? `<p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: #334155;">${introText}</p>` : ''}

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                ${instructionText}
              </p>

              <!-- Verification Code Block -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; margin-bottom: 8px;">
                      VERIFICATION CODE
                    </div>
                    <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e3a8a; font-family: 'Courier New', Courier, monospace; padding-left: 8px;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; color: #475569;">
                This code is valid for 10 minutes.
              </p>

              ${footerNote ? `<p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.5; color: #64748b;">${footerNote}</p>` : ''}

              <!-- Formal Institutional Signature -->
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 14px; line-height: 1.6; color: #334155;">
                Regards,<br>
                <strong>College AI Assistant</strong><br>
                Government Polytechnic Unnao
              </div>
            </td>
          </tr>

          <!-- Footer Notice -->
          <tr>
            <td style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
              This is an automated email. Please do not reply to this message.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends a registration verification OTP email.
 */
async function sendVerificationEmail({ email, name, otp }) {
  const subject = 'Government Polytechnic Unnao - Verify Your Email';
  const introText = 'Thank you for registering for College AI Assistant.';
  const instructionText = 'To complete your registration, enter the verification code below:';
  const footerNote = 'If you did not create this account, you can safely ignore this email.';

  const html = renderEmailTemplate({
    title: subject,
    greetingName: name,
    introText,
    instructionText,
    otp,
    footerNote,
  });

  return createTransporter().sendMail({
    from: DEFAULT_FROM,
    to: email,
    subject,
    html,
  });
}

/**
 * Sends a password reset verification OTP email.
 */
async function sendPasswordResetEmail({ email, name, otp }) {
  const subject = 'Government Polytechnic Unnao - Password Reset Verification';
  const introText = 'A password reset request was made for your College AI Assistant account.';
  const instructionText = 'Use the verification code below to continue:';
  const footerNote = 'If you did not request a password reset, you can safely ignore this email.';

  const html = renderEmailTemplate({
    title: subject,
    greetingName: name,
    introText,
    instructionText,
    otp,
    footerNote,
  });

  return createTransporter().sendMail({
    from: DEFAULT_FROM,
    to: email,
    subject,
    html,
  });
}

module.exports = {
  validateEmailConfig,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
