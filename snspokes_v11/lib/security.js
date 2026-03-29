// Security helpers - CSRF, rate limiting, input sanitization

import crypto from 'crypto';

// CSRF Token generation and verification
const CSRF_SECRET = process.env.NEXTAUTH_SECRET || 'csrf-secret-change-me';

export function generateCsrfToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac('sha256', CSRF_SECRET)
    .update(token + timestamp)
    .digest('hex');
  return `${token}.${timestamp}.${signature}`;
}

export function verifyCsrfToken(token) {
  try {
    if (!token) return false;
    const [t, timestamp, signature] = token.split('.');
    if (!t || !timestamp || !signature) return false;

    // Check expiry (1 hour)
    if (Date.now() - parseInt(timestamp) > 3600000) return false;

    const expected = crypto.createHmac('sha256', CSRF_SECRET)
      .update(t + timestamp)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Content Security Policy headers
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

// Sanitize HTML (basic)
export function sanitizeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Check if IP is suspicious (basic)
const suspiciousPatterns = [/127\.0\.0\.1/, /::1/, /0\.0\.0\.0/];
export function isTrustedIp(ip) {
  // Add your trusted IPs here
  const trustedIps = (process.env.TRUSTED_IPS || '').split(',').filter(Boolean);
  return trustedIps.includes(ip) || suspiciousPatterns.some(p => p.test(ip));
}
