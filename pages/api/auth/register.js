import bcrypt from 'bcryptjs';
import { query } from '../../../lib/db';
import { sendWelcomeEmail } from '../../../lib/email';
import { sanitizeString, sanitizeEmail, validatePasswordStrength, setSecurityHeaders } from '../../../lib/security';
import { checkRegisterRateLimit } from '../../../lib/rateLimitLogin';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const rl = await checkRegisterRateLimit(req);
  if (!rl.allowed) return res.status(429).json({ success: false, error: rl.message });

  const { name, email, password, ref_code } = req.body || {};
  const cleanName  = sanitizeString(name, 100);
  const cleanEmail = sanitizeEmail(email);

  if (!cleanName)  return res.status(400).json({ success: false, error: 'Name is required' });
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
    return res.status(400).json({ success: false, error: 'Valid email is required' });

  const pwCheck = validatePasswordStrength(password);
  if (!pwCheck.valid) return res.status(400).json({ success: false, error: pwCheck.message });

  const existing = await query('SELECT id FROM sn_users WHERE email=$1', [cleanEmail]);
  if (existing.rows.length > 0)
    return res.status(400).json({ success: false, error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 12);
  const newUser = await query(
    'INSERT INTO sn_users (name, email, password_hash, plan, onboarded, is_active, created_at) VALUES ($1,$2,$3,\'free\',false,true,NOW()) RETURNING id, email, name',
    [cleanName, cleanEmail, hash]
  );
  const uid = newUser.rows[0].id;

  if (ref_code) {
    try {
      const ref = await query('SELECT id FROM sn_referrals WHERE code=$1', [sanitizeString(ref_code, 20).toUpperCase()]);
      if (ref.rows[0]) await query('INSERT INTO sn_referral_uses (referral_id, referred_user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ref.rows[0].id, uid]);
    } catch {}
  }

  sendWelcomeEmail(cleanEmail, cleanName).catch(() => {});
  return res.status(200).json({ success: true, user: { id: uid, email: cleanEmail, name: cleanName } });
}
