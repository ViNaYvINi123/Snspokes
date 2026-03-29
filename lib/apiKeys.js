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
