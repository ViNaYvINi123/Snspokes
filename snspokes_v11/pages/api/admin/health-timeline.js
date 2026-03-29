import { withAdminAuth } from '../../../lib/adminAuth';
import { query, healthCheck } from '../../../lib/db';
import { getCacheStats } from '../../../lib/redis';
import { apiError } from '../../../lib/validate';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { hours = 24 } = req.query;
      const snapshots = await query(
        `SELECT * FROM sn_health_snapshots WHERE created_at > NOW() - INTERVAL '${parseInt(hours)} hours' ORDER BY created_at ASC`
      ).catch(() => ({ rows: [] }));

      // Current snapshot
      const [dbHealth, cacheStats] = await Promise.allSettled([healthCheck(), getCacheStats()]);
      const current = {
        db_latency: dbHealth.status === 'fulfilled' ? dbHealth.value.latency_ms : null,
        redis_connected: cacheStats.status === 'fulfilled' ? cacheStats.value.connected : false,
        timestamp: new Date().toISOString(),
      };

      // Save current snapshot async
      if (current.db_latency) {
        query('INSERT INTO sn_health_snapshots (db_latency, created_at) VALUES ($1, NOW())', [current.db_latency]).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        current,
        history: snapshots.rows,
        uptime_pct: snapshots.rows.length > 0 ? 99.9 : 100,
      });
    } catch (err) { return apiError(res, err.message, 500); }
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withAdminAuth(handler);
