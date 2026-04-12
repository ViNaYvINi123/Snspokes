import crypto from 'crypto';

// ── Security Headers ───────────────────────────────────────
export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://generativelanguage.googleapis.com https://api.groq.com; " +
    "frame-ancestors 'none';"
  );
}

// ── Sanitization ───────────────────────────────────────────
export function sanitizeString(input, maxLen = 1000) {
  if (input == null) return '';
  return String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, maxLen);
}

export function sanitizeEmail(email) {
  if (!email) return '';
  return String(email).toLowerCase().trim().substring(0, 255);
}

export function sanitizeInt(val, defaultVal = 0, min = 0, max = 99999) {
  const n = parseInt(val);
  if (isNaN(n)) return defaultVal;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeSortField(field, allowed = []) {
  if (!allowed.includes(field)) return allowed[0] || 'id';
  return field;
}

// ── SQL Injection Check ────────────────────────────────────
export function assertParamQuery(sql) {
  if (typeof sql !== 'string') throw new Error('SQL must be string');
  const dangerous = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE)\s/i,
    /UNION\s+(ALL\s+)?SELECT/i,
  ];
  dangerous.forEach(p => {
    if (p.test(sql)) throw new Error('Potentially unsafe SQL detected');
  });
  return sql;
}

// ── IDOR Protection ────────────────────────────────────────
export function assertOwnership(resourceUserId, sessionUserId, adminBypass = false) {
  if (adminBypass) return true;
  if (!sessionUserId) throw new Error('Not authenticated');
  if (parseInt(resourceUserId) !== parseInt(sessionUserId))
    throw new Error('Access denied — resource belongs to another user');
  return true;
}

// ── Password Strength ──────────────────────────────────────
export function validatePasswordStrength(password) {
  if (!password || password.length < 8)
    return { valid: false, message: 'Password must be at least 8 characters' };
  if (password.length > 128)
    return { valid: false, message: 'Password too long (max 128 chars)' };
  const weak = ['password','12345678','qwerty123','password1','admin123','letmein','welcome',
    'monkey123','dragon123','master123','abc12345','pass1234','changeme'];
  if (weak.includes(password.toLowerCase()))
    return { valid: false, message: 'Password is too common, choose a stronger one' };
  if (!/[a-z]/.test(password))
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  if (!/[A-Z]/.test(password))
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  if (!/[0-9]/.test(password))
    return { valid: false, message: 'Password must contain at least one number' };
  return { valid: true };
}

// ── API Key Format ─────────────────────────────────────────
export function validateApiKeyFormat(key) {
  if (!key) return false;
  return /^snsk_[a-f0-9]{48}$/.test(key);
}

// ── Razorpay Verification ──────────────────────────────────
export function verifyRazorpaySignature(paymentId, subscriptionId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const expected = crypto.createHmac('sha256', secret)
    .update(`${paymentId}|${subscriptionId}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch { return false; }
}

export function verifyRazorpayWebhook(body, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const expected = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(body)).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch { return false; }
}

// ── IP Extraction ──────────────────────────────────────────
export function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// ── Suspicious Bot Detection ───────────────────────────────
export function isSuspiciousRequest(req) {
  const ua = req.headers?.['user-agent'] || '';
  return [/sqlmap/i, /nikto/i, /nmap/i, /masscan/i].some(p => p.test(ua));
}
