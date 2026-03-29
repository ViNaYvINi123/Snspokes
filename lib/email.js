// ============================================================
// snspokes — Email Client
// - Queue-based sending (non-blocking)
// - Retry on failure (3 attempts)
// - Connection reuse
// - HTML templates
// - Graceful degradation if SMTP not configured
// ============================================================

import nodemailer from 'nodemailer';
import logger from './logger';

let transporter = null;
let isConfigured = false;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    logger.warn('[email] SMTP not configured — emails will be logged only');
    isConfigured = false;
    return null;
  }

  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool:   true,      // Reuse connections
    maxConnections: 3, // Max 3 parallel sends
    rateDelta: 1000,   // Max 1 email per second
    rateLimit: 10,     // Max 10 per rateDelta window
  });

  isConfigured = true;
  return transporter;
}

const FROM = () => `"${process.env.SMTP_FROM_NAME || 'snspokes'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@snspokes.com'}>`;

// ── Base HTML template ─────────────────────────────────────
const template = (content) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#e2e8f0;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:32px;height:32px;background:linear-gradient(135deg,#7C3AED,#2563EB);border-radius:8px;display:inline-block"></div>
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.04em">snspokes</span>
    </div>
    <p style="color:#6b7280;font-size:12px;margin:0">ServiceNow Integration Hub</p>
  </div>
  <div style="background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px">
    ${content}
  </div>
  <p style="text-align:center;color:#374151;font-size:12px;margin-top:24px">
    © ${new Date().getFullYear()} snspokes · <a href="${process.env.NEXTAUTH_URL}/dashboard" style="color:#6b7280">Dashboard</a>
  </p>
</div></body></html>`;

const btn = (text, url) =>
  `<div style="text-align:center;margin:28px 0"><a href="${url}" style="background:linear-gradient(135deg,#7C3AED,#2563EB);color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${text}</a></div>`;

// ── Core send function with retry ──────────────────────────
export async function sendEmail({ to, subject, html, retries = 3 }) {
  if (process.env.MOCK_MODE === 'true') {
    logger.info(`[email] Mock mode — would send: ${subject} → ${to}`);
    return true;
  }

  const t = getTransporter();
  if (!t) {
    logger.info(`[email] No SMTP — logging: ${subject} → ${to}`);
    return false;
  }

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await t.sendMail({ from: FROM(), to, subject, html });
      logger.info(`[email] Sent: ${subject} → ${to}`);
      return true;
    } catch (err) {
      lastError = err;
      logger.warn(`[email] Attempt ${attempt}/${retries} failed for ${to}: ${err.message}`);
      if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  logger.error(`[email] Failed to send ${subject} → ${to}: ${lastError?.message}`);
  return false;
}

// ── Email templates ────────────────────────────────────────
export async function sendWelcomeEmail(to, name) {
  return sendEmail({
    to,
    subject: '👋 Welcome to snspokes!',
    html: template(`
      <h2 style="color:#fff;margin-top:0">Welcome, ${name || 'Developer'}! 🎉</h2>
      <p style="color:#9ca3af;line-height:1.6">You're now part of the snspokes community — the best ServiceNow Integration Hub reference for developers.</p>
      <p style="color:#9ca3af">Here's what you can do:</p>
      <ul style="color:#9ca3af;padding-left:20px;line-height:1.8">
        <li>🔍 Search 500+ ServiceNow spokes</li>
        <li>💻 Generate production-ready SN code with AI</li>
        <li>🐛 Debug errors with our AI analyzer</li>
        <li>📊 Build GlideRecord queries visually</li>
        <li>✅ Lint your scripts before deploying</li>
      </ul>
      ${btn('Go to Dashboard →', `${process.env.NEXTAUTH_URL}/dashboard`)}
      <p style="color:#6b7280;font-size:12px;text-align:center">Start with the free plan — upgrade anytime.</p>
    `),
  });
}

export async function sendPasswordResetEmail(to, resetUrl) {
  return sendEmail({
    to,
    subject: '🔐 Reset your snspokes password',
    html: template(`
      <h2 style="color:#fff;margin-top:0">Password Reset</h2>
      <p style="color:#9ca3af;line-height:1.6">We received a request to reset your password. Click below to set a new one.</p>
      <p style="color:#EF4444;font-size:13px">⏱ This link expires in 1 hour.</p>
      ${btn('Reset Password →', resetUrl)}
      <p style="color:#6b7280;font-size:12px;text-align:center">If you didn't request this, you can safely ignore this email.</p>
    `),
  });
}

export async function sendPlanUpgradeEmail(to, name, newPlan) {
  const features = newPlan === 'pro'
    ? ['2000 searches/day', '100 AI generations/day', 'API access', 'Priority support']
    : ['Unlimited everything', 'Team seats', 'Dedicated support', 'Custom integrations'];

  return sendEmail({
    to,
    subject: `🎉 You're now on snspokes ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}!`,
    html: template(`
      <h2 style="color:#fff;margin-top:0">Upgrade Successful! 🚀</h2>
      <p style="color:#9ca3af">Hi ${name}, your plan is now <strong style="color:#A78BFA">${newPlan.toUpperCase()}</strong>.</p>
      <ul style="color:#9ca3af;padding-left:20px;line-height:1.8">
        ${features.map(f => `<li>✅ ${f}</li>`).join('')}
      </ul>
      ${btn('Access Your Dashboard →', `${process.env.NEXTAUTH_URL}/dashboard`)}
    `),
  });
}

export async function sendBackupAlertEmail(to, status, details) {
  const isSuccess = status === 'success';
  return sendEmail({
    to,
    subject: isSuccess ? '✅ snspokes backup complete' : '🔴 snspokes backup FAILED',
    html: template(`
      <h2 style="color:${isSuccess ? '#22c55e' : '#ef4444'};margin-top:0">
        Backup ${isSuccess ? 'Complete ✅' : 'Failed 🔴'}
      </h2>
      <pre style="background:#1f2937;padding:16px;border-radius:8px;color:#9ca3af;font-size:12px;overflow:auto;white-space:pre-wrap">${details}</pre>
      ${!isSuccess ? btn('Check Admin Panel →', `${process.env.NEXTAUTH_URL}/admin/backup`) : ''}
    `),
  });
}

export async function sendDowntimeAlert(to, message, durationMinutes) {
  return sendEmail({
    to,
    subject: '⚠️ snspokes service disruption',
    html: template(`
      <h2 style="color:#FFB347;margin-top:0">Service Disruption ⚠️</h2>
      <p style="color:#9ca3af;line-height:1.6">${message}</p>
      ${durationMinutes > 60 ? `<p style="color:#A78BFA">As compensation, we've added <strong>1 week free</strong> to your subscription.</p>` : ''}
      <p style="color:#9ca3af">We apologize for the inconvenience. Our team is working to resolve this.</p>
      ${btn('Check Status →', `https://status.snspokes.com`)}
    `),
  });
}

export async function verifySmtpConnection() {
  const t = getTransporter();
  if (!t) return { ok: false, reason: 'SMTP not configured' };
  try {
    await t.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

export async function sendTeamInviteEmail(to, inviterName, inviteUrl) {
  return sendEmail({
    to,
    subject: `${inviterName} invited you to join their snspokes team`,
    html: template(`
      <h2 style="color:#fff;margin-top:0">You're invited! 🎉</h2>
      <p style="color:#9ca3af;line-height:1.6"><strong style="color:#e2e8f0">${inviterName}</strong> has invited you to join their snspokes team.</p>
      <p style="color:#9ca3af">Click below to accept the invitation and join the team.</p>
      ${btn('Accept Invitation →', inviteUrl)}
      <p style="color:#6b7280;font-size:12px;text-align:center">This invite expires in 7 days. If you don't have an account, you'll be asked to create one.</p>
    `),
  });
}
