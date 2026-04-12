import { healthCheck } from '../../lib/db';
import { isRedisAvailable } from '../../lib/redis';
import { setSecurityHeaders } from '../../lib/security';
import pkg from '../../package.json';

const startTime = Date.now();

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).end();

  const [db] = await Promise.allSettled([healthCheck()]);

  const dbOk    = db.status === 'fulfilled' && db.value?.healthy;
  const redisOk = isRedisAvailable();
  const allOk   = dbOk;

  let poolStats = null;
  try { const m = await import('../../lib/db'); poolStats = await m.getPoolStats(); } catch {}

  let maintenanceMode = false;
  try {
    const { query } = await import('../../lib/db');
    const m = await query("SELECT value FROM sn_system_properties WHERE name='maintenance_mode'");
    maintenanceMode = m.rows[0]?.value === 'true';
  } catch {}

  const response = {
    maintenance_mode: maintenanceMode,
    status: allOk ? 'ok' : 'degraded',
    version: pkg.version,
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: {
      database: { ok: dbOk, latency_ms: db.value?.latency_ms, pool: poolStats },
      redis:    { ok: redisOk, note: redisOk ? 'connected' : 'using memory fallback' },
      ai:       { ok: true,  note: 'Gemini → Groq → Ollama' },
    },
  };

  res.setHeader('Cache-Control', 'no-cache, no-store');
  return res.status(allOk ? 200 : 503).json(response);
}
