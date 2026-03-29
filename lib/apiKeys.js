import crypto from 'crypto';
import { query } from './db';
import { cacheGet, cacheSet } from './redis';

export async function verifyApiKey(req) {
  const authHeader = req.headers?.authorization || '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!apiKey) return null;
  if (!/^snsk_[a-f0-9]{48}$/.test(apiKey)) return null;

  const cacheKey = `apikey:${apiKey.substring(0, 16)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch {} }

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const r = await query(
    `SELECT k.id, k.user_id, k.is_active, u.plan, u.is_banned, u.email FROM sn_api_keys k JOIN sn_users u ON u.id=k.user_id WHERE k.key_hash=$1 AND k.is_active=true AND u.is_active=true`,
    [keyHash]
  );
  if (r.rows.length === 0) return null;
  if (r.rows[0].is_banned) return null;
  if (!['pro', 'enterprise'].includes(r.rows[0].plan)) return null;

  query('UPDATE sn_api_keys SET last_used_at=NOW() WHERE id=$1', [r.rows[0].id]).catch(() => {});
  const result = { user_id: r.rows[0].user_id, plan: r.rows[0].plan, key_id: r.rows[0].id };
  await cacheSet(cacheKey, JSON.stringify(result), 300);
  return result;
}

export async function getUserApiKeys(userId) {
  const { query } = await import('./db');
  const r = await query(
    'SELECT id, name, key_prefix, last_used, created_at, is_active FROM sn_api_keys WHERE user_id=$1 ORDER BY created_at DESC',
    [userId]
  );
  return r.rows;
}

export async function createApiKey(userId, name) {
  const { query } = await import('./db');
  const crypto = await import('crypto');
  const raw    = 'snk_' + crypto.default.randomBytes(32).toString('hex');
  const prefix = raw.substring(0, 12);
  const bcrypt = await import('bcryptjs');
  const hashed = await bcrypt.default.hash(raw, 10);
  const r = await query(
    'INSERT INTO sn_api_keys (user_id, name, key_hash, key_prefix, is_active) VALUES ($1,$2,$3,$4,true) RETURNING id, name, key_prefix, created_at',
    [userId, name, hashed, prefix]
  );
  return { ...r.rows[0], key: raw };
}

export async function revokeApiKey(userId, keyId) {
  const { query } = await import('./db');
  await query('UPDATE sn_api_keys SET is_active=false WHERE id=$1 AND user_id=$2', [keyId, userId]);
}
