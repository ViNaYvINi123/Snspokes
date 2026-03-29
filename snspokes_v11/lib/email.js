// Email system using custom SMTP server (Hetzner or any SMTP)
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;
  try {
    const nodemailer = require('nodemailer');

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('[Email] SMTP not configured — emails will be queued');
      return null;
    }

    transporter = nodemailer.createTransport({
      host,
      port:   parseInt(process.env.SMTP_PORT  || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
      auth:   { user, pass },
      tls:    { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    });

    await transporter.verify();
    console.log('[Email] SMTP connected:', host);
    return transporter;
  } catch (err) {
    console.error('[Email] SMTP connection failed:', err.message);
    transporter = null;
    return null;
  }
}

const FROM_NAME  = process.env.SMTP_FROM_NAME  || 'snspokes';
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@snspokes.com';
const FROM       = `${FROM_NAME} <${FROM_EMAIL}>`;
const BASE_URL   = process.env.NEXTAUTH_URL || 'https://snspokes.com';

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:Inter,system-ui,sans-serif;background:#f9fafb;margin:0;padding:0}
.wrap{max-width:520px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}
.header{background:linear-gradient(135deg,#6c63ff,#a855f7);padding:28px 32px;text-align:center}
.header-logo{font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px}
.body{padding:28px 32px}
.footer{padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
h2{font-size:18px;font-weight:700;color:#111827;margin:0 0 12px}
p{font-size:14px;color:#374151;line-height:1.6;margin:0 0 14px}
.btn{display:inline-block;padding:11px 24px;background:#6c63ff;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px}
code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px}
</style></head>
<body><div class="wrap">
<div class="header"><div class="header-logo">snspokes</div></div>
<div class="body">${content}</div>
<div class="footer">snspokes — ServiceNow Integration Hub Reference<br>You received this because you have an account with us.</div>
</div></body></html>`;
}

export async function sendWelcomeEmail(email, name) {
  const html = baseTemplate(`
    <h2>Welcome to snspokes, ${name || 'Developer'}! 👋</h2>
    <p>You're now part of the best ServiceNow Integration Hub reference platform.</p>
    <p>🔍 <strong>Search</strong> any of 200+ Integration Hub spokes<br>
    🤖 <strong>AI answers</strong> powered by free LLMs<br>
    📖 <strong>Get setup guides</strong>, code examples, and error fixes</p>
    <p style="text-align:center;margin:24px 0"><a href="${BASE_URL}/search" class="btn">Start Searching →</a></p>
    <p style="font-size:12px;color:#9ca3af">Free plan: 50 searches/day. <a href="${BASE_URL}/pricing" style="color:#6c63ff">Upgrade to Pro</a> for 500/day.</p>
  `);
  return sendEmail({ to: email, subject: 'Welcome to snspokes 🚀', html });
}

export async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;
  const html = baseTemplate(`
    <h2>Reset your password</h2>
    <p>You requested a password reset for your snspokes account.</p>
    <p style="text-align:center;margin:24px 0"><a href="${resetUrl}" class="btn">Reset Password →</a></p>
    <p>This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
    <p style="font-size:12px;color:#9ca3af">Or copy: <code>${resetUrl}</code></p>
  `);
  return sendEmail({ to: email, subject: 'Reset your snspokes password', html });
}

export async function sendWeeklyDigest(email, name, stats) {
  const html = baseTemplate(`
    <h2>Your weekly snspokes digest 📊</h2>
    <p>Hi ${name || 'Developer'}, here's your week:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px;background:#f9fafb;border-radius:6px;font-size:13px;color:#374151"><strong>${stats.searches || 0}</strong> searches performed</td></tr>
      <tr><td style="padding:4px"></td></tr>
      <tr><td style="padding:8px;background:#f9fafb;border-radius:6px;font-size:13px;color:#374151"><strong>${stats.spokes_viewed || 0}</strong> spokes viewed</td></tr>
    </table>
    <p>🔥 <strong>Trending:</strong> ${(stats.trending || ['Slack', 'Jira', 'AWS']).join(', ')}</p>
    <p style="text-align:center;margin:20px 0"><a href="${BASE_URL}/search" class="btn">Explore Spokes →</a></p>
  `);
  return sendEmail({ to: email, subject: 'Your weekly snspokes digest', html });
}

export async function sendApiKeyEmail(email, keyName, keyPrefix) {
  const html = baseTemplate(`
    <h2>New API key created</h2>
    <p>An API key named <strong>${keyName}</strong> was created for your account.</p>
    <p>Key prefix: <code>${keyPrefix}...</code></p>
    <p>If you didn't create this, <a href="${BASE_URL}/dashboard/api-keys" style="color:#6c63ff">revoke it immediately</a>.</p>
  `);
  return sendEmail({ to: email, subject: 'New API key created — snspokes', html });
}

export async function sendEmail({ to, subject, html, text }) {
  const t = await getTransporter();

  if (!t) {
    // Queue for later
    try {
      const { query } = require('./db');
      await query(
        'INSERT INTO sn_email_queue (to_email, subject, body_html, body_text) VALUES ($1,$2,$3,$4)',
        [to, subject, html, text || '']
      );
    } catch {}
    return { success: false, queued: true, reason: 'SMTP not configured' };
  }

  try {
    const info = await t.sendMail({ from: FROM, to, subject, html, text });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    return { success: false, error: err.message };
  }
}
