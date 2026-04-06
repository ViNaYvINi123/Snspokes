import { query } from '../../lib/db';
import { checkRateLimit } from '../../lib/redis';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  const { email } = req.body || {};
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'anon';
  const rl = await checkRateLimit('subscribe:' + ip, 3, 3600);
  if (!rl.allowed) return res.status(429).json({ success: false, error: 'Too many attempts' });

  try {
    await query(
      'INSERT INTO sn_subscribers (email, source, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (email) DO NOTHING',
      [email.trim().toLowerCase(), 'footer']
    );
    return res.status(200).json({ success: true });
  } catch {
    return res.status(200).json({ success: true }); // Silent fail — don't expose DB errors
  }
}
