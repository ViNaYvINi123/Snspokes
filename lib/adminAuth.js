import jwt from 'jsonwebtoken';
import { checkRateLimit } from './redis';
import { setSecurityHeaders, getClientIp } from './security';
import logger from './logger';

function getAdminToken(req) {
  if (req.headers?.['x-admin-token']) return req.headers['x-admin-token'];
  if (req.headers?.authorization?.startsWith('Bearer ')) return req.headers.authorization.slice(7);
  if (req.cookies?.admin_token) return req.cookies.admin_token;
  return null;
}

export function withAdminAuth(handler) {
  return async function (req, res) {
    setSecurityHeaders(res);
    const ip = getClientIp(req);

    // Rate limit: 60 req/min per IP
    const rl = await checkRateLimit(`admin_api:${ip}`, 60, 60);
    if (!rl.allowed) return res.status(429).json({ success: false, error: 'Too many requests' });

    const token = getAdminToken(req);
    if (!token) return res.status(401).json({ success: false, error: 'Admin token required' });

    try {
      const decoded = jwt.verify(token, process.env.ADMIN_SECRET || 'changeme');
      if (decoded.role !== 'admin') throw new Error('Not admin');
      req.admin = decoded;
      return handler(req, res);
    } catch (err) {
      logger.warn(`[admin] Invalid token from ${ip}: ${err.message}`);
      return res.status(401).json({ success: false, error: 'Invalid or expired admin session' });
    }
  };
}

export function withAdminPage(Component) { return Component; }

export function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_SECRET || 'changeme');
    return { valid: decoded.role === 'admin', username: decoded.username };
  } catch { return { valid: false }; }
}
