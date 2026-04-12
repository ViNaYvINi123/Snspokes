import { checkRateLimit } from './redis';
import { getClientIp } from './security';
import logger from './logger';

// Login: 10 attempts per 15 min per IP, 10 per email
export async function checkLoginRateLimit(req, email) {
  const ip = getClientIp(req);
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`login:ip:${ip}`, 10, 900),
    checkRateLimit(`login:email:${String(email || '').toLowerCase()}`, 10, 900),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    logger.warn(`[security] Login rate limit from ${ip}`);
    const resetIn = Math.max(ipLimit.resetIn || 0, emailLimit.resetIn || 0);
    return { allowed: false, message: `Too many attempts. Try again in ${Math.ceil(resetIn / 60)} minutes.` };
  }
  return { allowed: true };
}

// Register: 20 per hour per IP (generous for testing)
export async function checkRegisterRateLimit(req) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`register:${ip}`, 20, 3600);
  if (!rl.allowed) return { allowed: false, message: 'Too many registrations. Try again later.' };
  return { allowed: true };
}

// Password reset: 5 per hour
export async function checkPasswordResetRateLimit(req, email) {
  const ip = getClientIp(req);
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`pwreset:ip:${ip}`, 5, 3600),
    checkRateLimit(`pwreset:email:${String(email || '').toLowerCase()}`, 5, 3600),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return { allowed: false, message: 'Too many attempts. Try again later.' };
  }
  return { allowed: true };
}
