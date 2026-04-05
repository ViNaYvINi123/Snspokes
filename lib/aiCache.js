import { query } from './db';
import { cacheGet, cacheSet } from './redis';
import crypto from 'crypto';

// Normalize query for matching (lowercase, trim, remove extra spaces)
function normalizeQuery(q) {
  return q.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[?!.]+$/, '');
}

// Generate cache key from query
function cacheKey(q, type = 'chat') {
  const normalized = normalizeQuery(q);
  return `ai:${type}:${crypto.createHash('md5').update(normalized).digest('hex')}`;
}

// Check Redis first, then DB
export async function getAICachedResponse(question, type = 'chat') {
  const key = cacheKey(question, type);

  // 1. Check Redis (fast, TTL-based)
  const redisResult = await cacheGet(key);
  if (redisResult) {
    try {
      const parsed = typeof redisResult === 'string' ? JSON.parse(redisResult) : redisResult;
      return { ...parsed, cached: true, cache_source: 'redis' };
    } catch {}
  }

  // 2. Check DB (persistent, survives restarts)
  try {
    const normalized = normalizeQuery(question);
    const r = await query(
      `SELECT answer, model, created_at FROM sn_ai_cache 
       WHERE normalized_query = $1 AND type = $2 AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC LIMIT 1`,
      [normalized, type]
    );
    if (r.rows[0]) {
      const result = { answer: r.rows[0].answer, model: r.rows[0].model, cached: true, cache_source: 'db' };
      // Promote to Redis for faster next hit
      await cacheSet(key, JSON.stringify(result), 3600);
      // Increment hit count
      query('UPDATE sn_ai_cache SET hit_count = hit_count + 1 WHERE normalized_query = $1 AND type = $2', [normalized, type]).catch(() => {});
      return result;
    }
  } catch {}

  return null; // Cache miss
}

// Store response in both Redis and DB
export async function setAICachedResponse(question, answer, model, type = 'chat') {
  const key = cacheKey(question, type);
  const normalized = normalizeQuery(question);
  const data = { answer, model };

  // Redis (1 hour TTL)
  await cacheSet(key, JSON.stringify(data), 3600);

  // DB (persistent, 7 day retention)
  try {
    await query(
      `INSERT INTO sn_ai_cache (normalized_query, original_query, answer, model, type, hit_count, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, NOW())
       ON CONFLICT (normalized_query, type) DO UPDATE SET answer = $3, model = $4, created_at = NOW()`,
      [normalized, question.trim().substring(0, 500), answer.substring(0, 10000), model || 'unknown', type]
    );
  } catch {}
}
