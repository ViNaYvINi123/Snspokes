// Validation & sanitization helpers

export function validateRequired(obj, fields) {
  for (const field of fields) {
    const val = obj?.[field];
    if (val === null || val === undefined || (typeof val === 'string' && !val.trim())) {
      return `${field} is required`;
    }
  }
  return null;
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

export function sanitizeInput(input) {
  if (input == null) return '';
  return String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function sanitizeString(input, maxLen = 1000) {
  if (input == null) return '';
  return String(input).trim().substring(0, maxLen);
}

export function apiError(res, message, status = 500) {
  return res.status(status).json({ success: false, error: message });
}

export function validatePagination(page, limit = 10) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 10));
  return { page: p, limit: l, offset: (p - 1) * l };
}

export function sanitizePage(page, limit = 10) {
  const p   = Math.max(1, parseInt(page) || 1);
  const lim = Math.min(100, Math.max(1, parseInt(limit) || 10));
  return { page: p, limit: lim, offset: (p - 1) * lim };
}
