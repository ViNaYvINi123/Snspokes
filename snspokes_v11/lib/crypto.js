// Simple encryption for API keys/secrets
// Uses AES-256 via Node's built-in crypto module

import crypto from 'crypto';

const ALGO = 'aes-256-cbc';
const KEY = Buffer.from(
  (process.env.ENCRYPTION_KEY || 'snspokes-default-key-change-in-production-32c').substring(0, 32).padEnd(32, '0'),
  'utf8'
);

export function encrypt(text) {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch {
    return text; // fallback
  }
}

export function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  try {
    const [ivHex, encHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return text; // fallback
  }
}

export function maskSecret(value, showChars = 4) {
  if (!value) return '';
  if (value.length <= showChars * 2) return '••••••••';
  return value.substring(0, showChars) + '••••••••' + value.substring(value.length - showChars);
}

export function isEncrypted(text) {
  return text && text.includes(':') && text.split(':').length === 2;
}
