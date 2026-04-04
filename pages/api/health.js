// Health check endpoint - used by uptime monitors (UptimeRobot, etc.)
import { healthCheck } from '../../lib/db';
import { isRedisAvailable } from '../../lib/redis';
import axios from 'axios';
import { setSecurityHeaders } from '../../lib/security';

const startTime = Date.now();

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).end();

  const start = Date.now();

  const [db, n8nHealth] = await Promise.allSettled([
    healthCheck(),
    axios.get((process.env.N8N_URL || 'http://snspokes_n8n:5678') + '/healthz', { timeout: 3000 })
      .then(() => ({ healthy: true }))
      .catch(() => ({ healthy: false })),
  ]);

  const dbOk = db.status === 'fulfilled' && db.value.healthy;
  const redisOk = isRedisAvailable();
  const n8nOk = n8nHealth.status === 'fulfilled' && n8nHealth.value.healthy;

  const allOk = dbOk && n8nOk; // DB is the only critical dependency
  const status = allOk ? 200 : 503;

  // Get additional system info
  let poolStats = null;
  let circuitStatus = null;
  try {
    const dbLib = await import('../../lib/db');
    poolStats = await dbLib.getPoolStats();
  } catch {}
  try {
    const n8nLib = await import('../../lib/n8n');
    circuitStatus = n8nLib.getCircuitBreakerStatus();
  } catch {}

  let maintenanceMode = false;
  try {
    const { query } = await import('../../lib/db');
    const m = await query("SELECT value FROM sn_system_properties WHERE name='maintenance_mode'");
    maintenanceMode = m.rows[0]?.value === 'true';
  } catch {}

  const response = {
    maintenance_mode: maintenanceMode,
    status: allOk ? 'ok' : 'degraded',
    version: '32.9.0',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: {
      database:  { ok: dbOk,     latency_ms: db.value?.latency_ms },
      redis:     { ok: redisOk,  note: redisOk ? 'connected' : 'using memory fallback' },
      n8n_ai: { ok: n8nOk, note: n8nOk ? 'n8n connected' : 'n8n offline — AI unavailable' },
    },
  };

  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(response);
}
