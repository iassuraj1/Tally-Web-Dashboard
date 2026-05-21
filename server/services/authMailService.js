const crypto = require('crypto');
const nodemailer = require('nodemailer');

const TOKEN_BYTES = 32;
const DEFAULT_TTL_HOURS = 24;

const smtpConfigured = () => Boolean(process.env.SMTP_HOST);

const getFrontendUrl = (frontendUrl) => (
  frontendUrl ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173'
).replace(/\/+$/, '');

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const createVerificationToken = () => {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const ttlHours = Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS || DEFAULT_TTL_HOURS);
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + Math.max(1, ttlHours) * 60 * 60 * 1000),
  };
};

const buildVerificationUrl = (token, email, frontendUrl) => {
  const params = new URLSearchParams({ token });
  if (email) params.set('email', email);
  return `${getFrontendUrl(frontendUrl)}/app/verify-email?${params.toString()}`;
};

const createTransporter = () => {
  if (!smtpConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
};

const sendVerificationEmail = async ({ user, token, frontendUrl }) => {
  const verificationUrl = buildVerificationUrl(token, user.email, frontendUrl);
  const appName = process.env.APP_NAME || 'Suraj Prime Web';
  const to = user.email;
  const subject = `Verify your ${appName} email`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2>Verify your email address</h2>
      <p>Hello ${escapeHtml(user.name || '')},</p>
      <p>Please verify your email address before signing in to ${escapeHtml(appName)}.</p>
      <p>
        <a href="${escapeHtml(verificationUrl)}" style="display:inline-block;background:#003087;color:#fff;padding:11px 16px;border-radius:8px;text-decoration:none;font-weight:700">
          Verify Email
        </a>
      </p>
      <p>This link will expire in ${Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS || DEFAULT_TTL_HOURS)} hours.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    </div>
  `;
  const text = [
    `Hello ${user.name || ''},`,
    '',
    `Please verify your email address before signing in to ${appName}.`,
    verificationUrl,
    '',
    `This link will expire in ${Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS || DEFAULT_TTL_HOURS)} hours.`,
  ].join('\n');

  const transporter = createTransporter();
  if (!transporter) {
    return {
      sent: false,
      configured: false,
      devVerificationUrl: process.env.NODE_ENV === 'production' ? undefined : verificationUrl,
    };
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
  });

  return { sent: true, configured: true, messageId: info.messageId };
};

module.exports = {
  createVerificationToken,
  hashToken,
  sendVerificationEmail,
};
