import { checkRateLimit } from './redis';
import { getClientIp } from './security';
import logger from './logger';

export async function checkLoginRateLimit(req, email) {
  const ip = getClientIp(req);
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`login:ip:${ip}`, 5, 900),
    checkRateLimit(`login:email:${String(email || '').toLowerCase()}`, 5, 900),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    logger.warn(`[security] Login brute force from ${ip}`);
    const resetIn = Math.max(ipLimit.resetIn || 0, emailLimit.resetIn || 0);
    return { allowed: false, message: `Too many attempts. Try again in ${Math.ceil(resetIn / 60)} minutes.` };
  }
  return { allowed: true };
}

export async function checkRegisterRateLimit(req) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`register:${ip}`, 10, 3600);
  if (!rl.allowed) return { allowed: false, message: 'Too many registrations from this IP.' };
  return { allowed: true };
}

export async function checkPasswordResetRateLimit(req, email) {
  const ip = getClientIp(req);
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`pwreset:ip:${ip}`, 3, 3600),
    checkRateLimit(`pwreset:email:${String(email || '').toLowerCase()}`, 3, 3600),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed)
    return { allowed: false, message: 'Too many reset requests. Try again later.' };
  return { allowed: true };
}
