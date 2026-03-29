// Redis is OPTIONAL - all functions degrade gracefully if Redis is unavailable
let Redis = null;
let redisClient = null;
let redisAvailable = false;

async function initRedis() {
  if (redisClient) return redisClient;
  try {
    const IORedis = (await import('ioredis')).default;
    const config = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null, // Don't retry - fail fast
    };
    const client = new IORedis(config);
    await client.connect();
    await client.ping();
    redisClient = client;
    redisAvailable = true;
    console.log('[Redis] Connected successfully');
    client.on('error', () => { redisAvailable = false; });
    return client;
  } catch (err) {
    redisAvailable = false;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Redis] Not available - running without cache:', err.message);
    }
    return null;
  }
}

// In-memory fallback cache
const memCache = new Map();

export function getRedis() { return redisClient; }
export function isRedisAvailable() { return redisAvailable; }

// ── CACHE ──
export async function cacheGet(key) {
  try {
    const client = await initRedis();
    if (client) {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    }
  } catch {}
  // Fallback to memory cache
  const item = memCache.get(key);
  if (item && item.expires > Date.now()) return item.value;
  return null;
}

export async function cacheSet(key, value, ttlSeconds = 3600) {
  try {
    const client = await initRedis();
    if (client) {
      await client.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    }
  } catch {}
  // Fallback to memory cache
  memCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  // Clean up old entries periodically
  if (memCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of memCache.entries()) {
      if (v.expires < now) memCache.delete(k);
    }
  }
  return true;
}

export async function cacheDel(key) {
  try {
    const client = await initRedis();
    if (client) await client.del(key);
  } catch {}
  memCache.delete(key);
  return true;
}

// ── RATE LIMITING ──
const rateLimitMap = new Map();

export async function checkRateLimit(identifier, maxRequests = 30, windowSeconds = 60) {
  try {
    const client = await initRedis();
    if (client) {
      const key = `rate:${identifier}`;
      const current = await client.incr(key);
      if (current === 1) await client.expire(key, windowSeconds);
      const ttl = await client.ttl(key);
      return {
        allowed: current <= maxRequests,
        current,
        max: maxRequests,
        remaining: Math.max(0, maxRequests - current),
        resetIn: ttl,
      };
    }
  } catch {}
  // In-memory rate limiting fallback
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitMap.get(key);
  if (!entry || entry.windowEnd < now) {
    rateLimitMap.set(key, { count: 1, windowEnd: now + windowSeconds * 1000 });
    return { allowed: true, current: 1, max: maxRequests, remaining: maxRequests - 1, resetIn: windowSeconds };
  }
  entry.count++;
  return {
    allowed: entry.count <= maxRequests,
    current: entry.count,
    max: maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetIn: Math.ceil((entry.windowEnd - now) / 1000),
  };
}

// ── TRENDING ──
const trendingMap = new Map();
export async function trackQuery(query) {
  try {
    const client = await initRedis();
    const normalized = query.toLowerCase().trim();
    if (client) {
      await Promise.all([
        client.zincrby('trending:queries:all', 1, normalized),
        client.lpush('recent:queries', JSON.stringify({ query: normalized, ts: Date.now() })),
        client.ltrim('recent:queries', 0, 99),
      ]);
      return;
    }
  } catch {}
  // Memory fallback
  trendingMap.set(query, (trendingMap.get(query) || 0) + 1);
}

export async function getTrending(count = 10) {
  try {
    const client = await initRedis();
    if (client) {
      const results = await client.zrevrange('trending:queries:all', 0, count - 1, 'WITHSCORES');
      const trending = [];
      for (let i = 0; i < results.length; i += 2) {
        trending.push({ query: results[i], count: parseInt(results[i + 1]) });
      }
      return trending;
    }
  } catch {}
  // Memory fallback
  return Array.from(trendingMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([query, count]) => ({ query, count }));
}

const recentQueries = [];
export async function getRecentQueries(count = 20) {
  try {
    const client = await initRedis();
    if (client) {
      const items = await client.lrange('recent:queries', 0, count - 1);
      return items.map(item => { try { return JSON.parse(item); } catch { return null; } }).filter(Boolean);
    }
  } catch {}
  return recentQueries.slice(0, count);
}

export async function getCacheStats() {
  try {
    const client = await initRedis();
    if (client) {
      const info = await client.info('stats');
      const lines = info.split('\r\n');
      const stats = {};
      lines.forEach(line => { const [k, v] = line.split(':'); if (k && v) stats[k.trim()] = v.trim(); });
      const keys = await client.dbsize();
      return {
        connected: true,
        keys,
        hits: parseInt(stats.keyspace_hits || 0),
        misses: parseInt(stats.keyspace_misses || 0),
        hit_rate: (stats.keyspace_hits && stats.keyspace_misses)
          ? ((parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses))) * 100).toFixed(1) + '%'
          : 'N/A',
      };
    }
  } catch {}
  return { connected: false, fallback: 'memory', keys: memCache.size };
}
