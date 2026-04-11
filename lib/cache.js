/**
 * snspokes Cache Layer
 *
 * Strategy: Cache-Aside with TTL tiers
 *
 * WHAT we cache and WHY:
 *   search results     1h  — same query = same result for an hour
 *   spoke pages        5m  — spoke data rarely changes
 *   API reference      1h  — never changes between deploys
 *   feature flags      60s — admin can change them
 *   user sessions      30m — auth tokens
 *   system stats       30s — dashboard metrics
 *
 * With Redis caching:
 *   - 99% of search traffic never hits Postgres
 *   - Spoke pages served from memory in < 1ms
 *   - Billions of reads = same cost as thousands
 */

import { cacheGet, cacheSet, cacheDelete } from './redis';

const TTL = {
  SEARCH:      3600,   // 1 hour
  SPOKE:        300,   // 5 minutes
  API_REF:     3600,   // 1 hour
  FLAGS:         60,   // 1 minute
  USER:        1800,   // 30 minutes
  STATS:         30,   // 30 seconds
  RELEASE_NOTES: 3600, // 1 hour
};

// Build a consistent cache key
export function cacheKey(namespace, ...parts) {
  return `${namespace}:${parts.map(p => String(p).toLowerCase().replace(/\s+/g,'_').slice(0,80)).join(':')}`;
}

// Cache-aside pattern: check cache, if miss run fn, store result
export async function withCache(key, ttl, fn) {
  try {
    const cached = await cacheGet(key);
    if (cached !== null && cached !== undefined) {
      try { return JSON.parse(cached); } catch { return cached; }
    }
  } catch {}

  const result = await fn();

  if (result !== null && result !== undefined) {
    try { await cacheSet(key, JSON.stringify(result), ttl); } catch {}
  }
  return result;
}

// Invalidate by namespace prefix
export async function invalidate(namespace) {
  try { await cacheDelete(namespace + ':*'); } catch {}
}

export const CACHE_TTL = TTL;

// Pre-built cache helpers for common patterns
export const searchCache = {
  get: (query, ctx = '') => cacheGet(cacheKey('search', query, ctx)),
  set: (query, ctx, data) => cacheSet(cacheKey('search', query, ctx), JSON.stringify(data), TTL.SEARCH),
};

export const spokeCache = {
  get: (slug) => cacheGet(cacheKey('spoke', slug)),
  set: (slug, data) => cacheSet(cacheKey('spoke', slug), JSON.stringify(data), TTL.SPOKE),
};

export const statsCache = {
  get: () => cacheGet('stats:dashboard'),
  set: (data) => cacheSet('stats:dashboard', JSON.stringify(data), TTL.STATS),
};
