// Health check endpoint - used by uptime monitors (UptimeRobot, etc.)
import { healthCheck } from '../../lib/db';
import { isRedisAvailable } from '../../lib/redis';
import axios from 'axios';

const startTime = Date.now();

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const start = Date.now();

  const [db, ollama] = await Promise.allSettled([
    healthCheck(),
    axios.get(`${process.env.OLLAMA_URL || 'http://172.19.0.1:11434'}/api/tags`, { timeout: 2000 })
      .then(() => ({ healthy: true }))
      .catch(() => ({ healthy: false })),
  ]);

  const dbOk = db.status === 'fulfilled' && db.value.healthy;
  const redisOk = isRedisAvailable();
  const ollamaOk = ollama.status === 'fulfilled' && ollama.value.healthy;

  const allOk = dbOk; // DB is the only critical dependency
  const status = allOk ? 200 : 503;

  const response = {
    status: allOk ? 'ok' : 'degraded',
    version: '9.0.0',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: {
      database:  { ok: dbOk,     latency_ms: db.value?.latency_ms },
      redis:     { ok: redisOk,  note: redisOk ? 'connected' : 'using memory fallback' },
      ollama_ai: { ok: ollamaOk, note: ollamaOk ? 'connected' : 'offline (OpenRouter fallback active)' },
    },
  };

  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(response);
}
