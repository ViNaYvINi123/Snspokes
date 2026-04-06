import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [total, today, byPlan, byEndpoint, topUsers, avgLatency] = await Promise.all([
    query('SELECT COUNT(*) as c FROM sn_api_logs').catch(() => ({ rows: [{ c: 0 }] })),
    query("SELECT COUNT(*) as c FROM sn_api_logs WHERE created_at > NOW() - INTERVAL '24 hours'").catch(() => ({ rows: [{ c: 0 }] })),
    query("SELECT plan, COUNT(*) as c FROM sn_api_logs WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY plan ORDER BY c DESC").catch(() => ({ rows: [] })),
    query("SELECT path, COUNT(*) as c FROM sn_api_logs WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY path ORDER BY c DESC LIMIT 10").catch(() => ({ rows: [] })),
    query("SELECT user_id, COUNT(*) as c FROM sn_api_logs WHERE created_at > NOW() - INTERVAL '24 hours' AND user_id IS NOT NULL GROUP BY user_id ORDER BY c DESC LIMIT 10").catch(() => ({ rows: [] })),
    query("SELECT ROUND(AVG(latency_ms)) as avg FROM sn_api_logs WHERE created_at > NOW() - INTERVAL '24 hours'").catch(() => ({ rows: [{ avg: 0 }] })),
  ]);

  return res.status(200).json({
    success: true,
    stats: {
      total_requests: parseInt(total.rows[0].c),
      today_requests: parseInt(today.rows[0].c),
      avg_latency_ms: parseInt(avgLatency.rows[0].avg || 0),
      by_plan: byPlan.rows,
      by_endpoint: byEndpoint.rows,
      top_users: topUsers.rows,
    },
  });
}
export default withAdminAuth(handler);
