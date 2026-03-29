import jwt from 'jsonwebtoken';
import { checkLoginAllowed, recordLoginAttempt } from '../../../lib/rateLimitLogin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const identifier = `admin:${username || 'unknown'}`;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Check brute force
  const check = await checkLoginAllowed(identifier);
  if (!check.allowed) {
    return res.status(429).json({
      error: check.message,
      lockout: true,
      retry_after: check.retry_after,
    });
  }

  const validUser = process.env.ADMIN_USERNAME || 'admin';
  const validPass = process.env.ADMIN_PASSWORD || 'snspokes@admin2025';

  if (username !== validUser || password !== validPass) {
    await recordLoginAttempt(identifier, false, ip);
    const remaining = 5 - (check.attempts || 0) - 1;
    return res.status(401).json({
      error: `Invalid credentials. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Account will be locked on next failure.'}`,
    });
  }

  // Success
  await recordLoginAttempt(identifier, true, ip);

  const token = jwt.sign(
    { username, role: 'admin', ip, iat: Date.now() },
    process.env.ADMIN_SECRET || 'snspokes-admin-jwt-2025',
    { expiresIn: '8h' }
  );

  // Set httpOnly cookie too
  res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${8*3600}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

  return res.status(200).json({ success: true, token });
}
