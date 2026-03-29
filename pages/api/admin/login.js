import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { setSecurityHeaders, getClientIp } from '../../../lib/security';
import { checkRateLimit } from '../../../lib/redis';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin_login:${ip}`, 5, 900);
  if (!rl.allowed) {
    logger.warn(`[security] Admin brute force from ${ip}`);
    return res.status(429).json({ success: false, error: `Too many attempts. Try again in ${Math.ceil(rl.resetIn / 60)} min.` });
  }

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, error: 'Credentials required' });

  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || '';

  // Timing-safe comparison
  let valid = false;
  try {
    const exp = Buffer.alloc(64); Buffer.from(adminPass).copy(exp);
    const got = Buffer.alloc(64); Buffer.from(password).copy(got);
    valid = crypto.timingSafeEqual(exp, got) && username === adminUser;
  } catch {}

  if (!valid) {
    logger.warn(`[security] Failed admin login from ${ip}`);
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { username: adminUser, role: 'admin', ip },
    process.env.ADMIN_SECRET || 'changeme',
    { expiresIn: '8h' }
  );

  res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=28800`);
  logger.info(`[security] Admin login from ${ip}`);
  return res.status(200).json({ success: true, token });
}
