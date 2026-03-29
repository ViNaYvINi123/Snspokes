// Validation helpers using Zod
// If Zod not available, falls back to manual validation

let z = null;

async function getZod() {
  if (z) return z;
  try {
    const zod = await import('zod');
    z = zod.z;
    return z;
  } catch {
    return null;
  }
}

// Simple validator without Zod dependency
export function validateRequired(obj, fields) {
  const errors = {};
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === 'string' && !obj[field].trim())) {
      errors[field] = `${field} is required`;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sanitizeString(str, maxLength = 500) {
  if (!str) return '';
  return String(str).trim().substring(0, maxLength);
}

export function sanitizeInt(val, defaultVal = 0, min = 0, max = 10000) {
  const n = parseInt(val);
  if (isNaN(n)) return defaultVal;
  return Math.min(Math.max(n, min), max);
}

export function sanitizePage(page, limit) {
  return {
    page: sanitizeInt(page, 1, 1, 1000),
    limit: sanitizeInt(limit, 20, 1, 100),
    get offset() { return (this.page - 1) * this.limit; }
  };
}

export function buildSearchWhere(search, columns) {
  if (!search?.trim()) return { clause: '', params: [] };
  const param = `%${search.trim().toLowerCase()}%`;
  const conditions = columns.map((col, i) => `LOWER(${col}) LIKE $${i + 1}`).join(' OR ');
  return {
    clause: `(${conditions})`,
    params: columns.map(() => param),
  };
}

export function apiResponse(res, { success = true, data = null, error = null, status = 200, meta = null }) {
  const body = { success };
  if (data !== null) Object.assign(body, data);
  if (error) body.error = error;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function apiError(res, message, status = 500, details = null) {
  const body = { success: false, error: message };
  if (details && process.env.NODE_ENV !== 'production') body.details = details;
  return res.status(status).json(body);
}
