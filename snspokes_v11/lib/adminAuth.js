import jwt from 'jsonwebtoken';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'snspokes-admin-secret-2025-change-me';

// Generate JWT token for admin
export function generateAdminToken() {
  return jwt.sign({ role: 'admin', ts: Date.now() }, ADMIN_SECRET, { expiresIn: '24h' });
}

// Verify JWT token
export function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(token, ADMIN_SECRET);
    return decoded.role === 'admin';
  } catch {
    return false;
  }
}

// Check admin auth from request
export function checkAdminAuth(req) {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyAdminToken(authHeader.substring(7));
  }
  // Check cookie
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies.admin_token;
  if (token) return verifyAdminToken(token);
  return false;
}

function parseCookies(cookieStr) {
  const cookies = {};
  if (!cookieStr) return cookies;
  cookieStr.split(';').forEach(part => {
    const [key, ...val] = part.trim().split('=');
    if (key) cookies[key.trim()] = decodeURIComponent(val.join('='));
  });
  return cookies;
}

// Middleware wrapper
export function withAdminAuth(handler) {
  return async (req, res) => {
    if (!checkAdminAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized', code: 'ADMIN_AUTH_REQUIRED' });
    }
    return handler(req, res);
  };
}
