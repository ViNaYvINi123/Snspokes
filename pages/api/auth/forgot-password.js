import logger from '../../../lib/logger';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../../../lib/db';
import { sendPasswordResetEmail } from '../../../lib/email';
import { sanitizeEmail, validatePasswordStrength, setSecurityHeaders } from '../../../lib/security';
import { checkPasswordResetRateLimit } from '../../../lib/rateLimitLogin';

export default async function handler(req, res) {
  try {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { action, email, token, password } = req.body || {};

  if (action === 'request') {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) return res.status(400).json({ success: false, error: 'Email required' });

    const rl = await checkPasswordResetRateLimit(req, cleanEmail);
    if (!rl.allowed) return res.status(429).json({ success: false, error: rl.message });

    const user = await query('SELECT id, email, name FROM sn_users WHERE email=$1 AND is_active=true', [cleanEmail]);
    if (user.rows.length > 0) {
      const uid = user.rows[0].id;
      await query('UPDATE sn_password_resets SET used=true WHERE user_id=$1 AND used=false', [uid]);
      const rawToken  = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await query('INSERT INTO sn_password_resets (user_id, token, expires_at) VALUES ($1,$2,NOW()+INTERVAL \'1 hour\')', [uid, tokenHash]);
      const resetUrl = `${process.env.NEXTAUTH_URL}/forgot-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.rows[0].email, resetUrl);
    }
    // Always return success — prevents email enumeration
    return res.status(200).json({ success: true });
  }

  if (action === 'reset') {
    if (!token || !password) return res.status(400).json({ success: false, error: 'Token and password required' });
    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) return res.status(400).json({ success: false, error: pwCheck.message });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const r = await query('SELECT * FROM sn_password_resets WHERE token=$1 AND used=false AND expires_at > NOW()', [tokenHash]);
    if (r.rows.length === 0) return res.status(400).json({ success: false, error: 'Token invalid or expired' });

    const hash = await bcrypt.hash(password, 12);
    await query('UPDATE sn_users SET password_hash=$1 WHERE id=$2', [hash, r.rows[0].user_id]);
    await query('UPDATE sn_password_resets SET used=true WHERE id=$1', [r.rows[0].id]);
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (err) {
    logger.error(`[handler] ${err.message}`);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
