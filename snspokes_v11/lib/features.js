// Feature Flags System
// Works with or without DB - falls back to env vars

import { query } from './db';

// In-memory cache for feature flags (refreshed every 60s)
let flagCache = null;
let flagCacheTime = 0;
const CACHE_TTL = 60000; // 60 seconds

export async function getAllFlags() {
  try {
    const result = await query(
      'SELECT key, label, description, enabled, rollout_pct, environment FROM sn_feature_flags ORDER BY key'
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function isEnabled(flagKey, userId = null) {
  try {
    // Use cache
    const now = Date.now();
    if (!flagCache || now - flagCacheTime > CACHE_TTL) {
      const rows = await getAllFlags();
      flagCache = {};
      rows.forEach(r => { flagCache[r.key] = r; });
      flagCacheTime = now;
    }

    const flag = flagCache[flagKey];
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Rollout percentage check
    if (flag.rollout_pct < 100 && userId) {
      const hash = userId % 100;
      return hash < flag.rollout_pct;
    }

    return flag.enabled;
  } catch {
    // Fallback to env var
    return process.env[`FEATURE_${flagKey.toUpperCase()}`] === 'true';
  }
}

export function invalidateFlagCache() {
  flagCache = null;
  flagCacheTime = 0;
}
