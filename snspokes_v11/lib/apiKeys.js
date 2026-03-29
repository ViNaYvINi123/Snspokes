// User API Key management
import crypto from 'crypto';
import { query } from './db';

const KEY_PREFIX = 'snk_'; // snspokes key prefix

export function generateApiKey() {
  const random = crypto.randomBytes(32).toString('hex');
  const key = `${KEY_PREFIX}${random}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12); // show first 12 chars to user
  return { key, hash, prefix };
}

export async function createApiKey(userId, name) {
  const { key, hash, prefix } = generateApiKey();
  const result = await query(
    `INSERT INTO sn_api_keys (user_id, name, key_hash, key_prefix, rate_limit)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, name, key_prefix, created_at`,
    [userId, name.trim(), hash, prefix, 100]
  );
  // Return full key ONCE - never stored in plain text
  return { ...result.rows[0], key, warning: 'Save this key now. It will never be shown again.' };
}

export async function validateApiKey(key) {
  if (!key || !key.startsWith(KEY_PREFIX)) return null;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  try {
    const result = await query(
      `SELECT k.*, u.plan, u.is_banned, u.email
       FROM sn_api_keys k
       JOIN sn_users u ON k.user_id = u.id
       WHERE k.key_hash=$1 AND k.is_active=true
       AND (k.expires_at IS NULL OR k.expires_at > NOW())`,
      [hash]
    );
    if (!result.rows.length) return null;
    const keyData = result.rows[0];
    if (keyData.is_banned) return null;

    // Update usage (async)
    query('UPDATE sn_api_keys SET last_used=NOW(), usage_count=usage_count+1 WHERE id=$1', [keyData.id]).catch(() => {});
    return keyData;
  } catch { return null; }
}

export async function getUserApiKeys(userId) {
  const result = await query(
    `SELECT id, name, key_prefix, last_used, usage_count, rate_limit, is_active, expires_at, created_at
     FROM sn_api_keys WHERE user_id=$1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function revokeApiKey(userId, keyId) {
  await query('UPDATE sn_api_keys SET is_active=false WHERE id=$1 AND user_id=$2', [keyId, userId]);
}
