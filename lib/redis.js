import { query } from './db';
// ============================================================
// snspokes — Redis Client
// Supports real Redis and mock mode for local dev
// ============================================================

import { createClient } from 'redis';

let client = null;
let redisAvailable = false;
let mockRedisModule = null;

async function getMockRedis() {
  if (!mockRedisModule) {
    const mod = await import('../mocks/backend.js');
    mockRedisModule = mod.mockRedis;
  }
  return mockRedisModule;
}

async function getClient() {
  if (client) return client;
  try {
    client = createClient({
      socket: { host: process.env.REDIS_HOST || 'snspokes_redis', port: parseInt(process.env.REDIS_PORT || '6379'), connectTimeout: 3000,
        reconnectStrategy: (retries) => Math.min(retries * 200, 5000) },
    });
    client.on('error', () => { redisAvailable = false; });
    client.on('ready', () => { redisAvailable = true; });
    await client.connect();
    redisAvailable = true;
  } catch {
    redisAvailable = false;
    client = null;
  }
  return client;
}

// In-memory fallback when Redis unavailable
const memCache = new Map();

export async function cacheGet(key) {
  if (process.env.MOCK_MODE === 'true') {
    const mock = await getMockRedis();
    return mock.cacheGet(key);
  }
  try {
    const c = await getClient();
    if (c && redisAvailable) return await c.get(key);
  } catch {}
  const item = memCache.get(key);
  if (!item) return null;
  if (item.expires && Date.now() > item.expires) { memCache.delete(key); return null; }
  return item.value;
}

export async function cacheSet(key, value, ttl = 300) {
  if (process.env.MOCK_MODE === 'true') {
    const mock = await getMockRedis();
    return mock.cacheSet(key, value, ttl);
  }
  try {
    const c = await getClient();
    if (c && redisAvailable) { await c.setEx(key, ttl, value); return true; }
  } catch {}
  memCache.set(key, { value, expires: Date.now() + ttl * 1000 });
  return true;
}

export async function cacheDel(key) {
  if (process.env.MOCK_MODE === 'true') {
    const mock = await getMockRedis();
    return mock.cacheDel(key);
  }
  try {
    const c = await getClient();
    if (c && redisAvailable) await c.del(key);
  } catch {}
  memCache.delete(key);
  return true;
}

export async function checkRateLimit(key, limit, windowSeconds) {
  if (process.env.MOCK_MODE === 'true') {
    const mock = await getMockRedis();
    return mock.checkRateLimit(key, limit, windowSeconds);
  }
  try {
    const c = await getClient();
    if (c && redisAvailable) {
      const current = await c.incr(key);
      if (current === 1) await c.expire(key, windowSeconds);
      const ttl = await c.ttl(key);
      return { allowed: current <= limit, remaining: Math.max(0, limit - current), resetIn: ttl > 0 ? ttl : windowSeconds };
    }
  } catch {}
  // Memory fallback
  const now = Date.now();
  const item = memCache.get(key) || { count: 0, reset: now + windowSeconds * 1000 };
  if (now > item.reset) { item.count = 0; item.reset = now + windowSeconds * 1000; }
  item.count++;
  memCache.set(key, item);
  return { allowed: item.count <= limit, remaining: Math.max(0, limit - item.count), resetIn: Math.ceil((item.reset - now) / 1000) };
}

export function isRedisAvailable() {
  if (process.env.MOCK_MODE === 'true') return false;
  return redisAvailable;
}

export async function getCacheStats() {
  try {
    if (!isRedisAvailable()) return { available: false, keys: 0, memory: 'N/A' };
    const c = await getClient();
    const info = await c.info('memory');
    const k = await c.dbSize();
    const memLine = info.split('\n').find(function(l) { return l.indexOf('used_memory_human:') === 0; });
    const mem = memLine ? memLine.split(':')[1].trim() : 'N/A';
    return { available: true, keys: k, memory: mem };
  } catch(e) { return { available: false, keys: 0, memory: 'N/A' }; }
}

export async function getTrending(limit = 10) {
  try {
    const r = await query("SELECT query, COUNT(*) as count FROM sn_search_analytics WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY query ORDER BY count DESC LIMIT $1", [limit]);
    return r.rows;
  } catch { return []; }
}

export async function getRecentQueries(limit = 20) {
  try {
    const r = await query('SELECT query, created_at FROM sn_search_analytics ORDER BY created_at DESC LIMIT $1', [limit]);
    return r.rows;
  } catch { return []; }
}
