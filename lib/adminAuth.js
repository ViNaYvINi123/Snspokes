import jwt from 'jsonwebtoken';
import { checkRateLimit } from './redis';
import { setSecurityHeaders, getClientIp } from './security';
import logger from './logger';

function getAdminToken(req) {
  if (req.headers?.['x-admin-token']) return req.headers['x-admin-token'];
  if (req.headers?.authorization?.startsWith('Bearer ')) return req.headers.authorization.slice(7);
  if (req.query?.token) return req.query.token;
  if (req.cookies?.admin_token) return req.cookies.admin_token;
  return null;
}

export function withAdminAuth(handler) {
  return async function (req, res) {
    setSecurityHeaders(res);
    const ip = getClientIp(req);

    const rl = await checkRateLimit(`admin_api:${ip}`, 120, 60);
    if (!rl.allowed) return res.status(429).json({ success: false, error: 'Too many requests' });

    const token = getAdminToken(req);
    if (!token) return res.status(401).json({ success: false, error: 'Admin token required' });

    const adminSecret = process.env.ADMIN_SECRET || 'changeme';

    // Method 1: Direct ADMIN_SECRET match (for CLI/curl)
    if (token === adminSecret) {
      req.admin = { username: 'admin', role: 'admin' };
      return handler(req, res);
    }

    // Method 2: JWT token verification (for browser/admin panel)
    try {
      const decoded = jwt.verify(token, adminSecret);
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
