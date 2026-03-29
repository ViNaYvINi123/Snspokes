import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const cached = await cacheGet('admin:command-center');
  if (cached) {
    try { return res.status(200).json({ ...JSON.parse(cached), cached: true }); } catch {}
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    users, newUsers, revenue, activeRevenue,
    searches, codeGens, errors, pendingSubmissions,
    recentUsers, recentSearches, recentErrors,
    planDist, topSearches, diskUsage
  ] = await Promise.all([
    query('SELECT COUNT(*) as total FROM sn_users WHERE is_active=true').catch(() => ({ rows: [{ total: 0 }] })),
    query(`SELECT COUNT(*) as total FROM sn_users WHERE created_at >= $1`, [todayStart]).catch(() => ({ rows: [{ total: 0 }] })),
    query("SELECT COALESCE(SUM(amount),0) as total FROM sn_payments WHERE status='active'").catch(() => ({ rows: [{ total: 0 }] })),
    query("SELECT COUNT(*) as total FROM sn_payments WHERE status='active'").catch(() => ({ rows: [{ total: 0 }] })),
    query(`SELECT COUNT(*) as total FROM sn_search_analytics WHERE created_at >= $1`, [todayStart]).catch(() => ({ rows: [{ total: 0 }] })),
    query(`SELECT COUNT(*) as total FROM sn_code_generations WHERE created_at >= $1`, [todayStart]).catch(() => ({ rows: [{ total: 0 }] })),
    query("SELECT COUNT(*) as total FROM sn_error_logs WHERE resolved=false").catch(() => ({ rows: [{ total: 0 }] })),
    query("SELECT COUNT(*) as total FROM sn_spoke_submissions WHERE status='pending'").catch(() => ({ rows: [{ total: 0 }] })),
    query('SELECT id, name, email, plan, created_at FROM sn_users ORDER BY created_at DESC LIMIT 5').catch(() => ({ rows: [] })),
    query('SELECT query, created_at FROM sn_search_analytics ORDER BY created_at DESC LIMIT 5').catch(() => ({ rows: [] })),
    query('SELECT message, source, created_at FROM sn_error_logs WHERE resolved=false ORDER BY created_at DESC LIMIT 5').catch(() => ({ rows: [] })),
    query("SELECT plan, COUNT(*) as count FROM sn_users WHERE is_active=true GROUP BY plan").catch(() => ({ rows: [] })),
    query('SELECT query, COUNT(*) as count FROM sn_search_analytics WHERE created_at >= NOW()-INTERVAL \'7 days\' GROUP BY query ORDER BY count DESC LIMIT 5').catch(() => ({ rows: [] })),
    query("SELECT pg_size_pretty(pg_database_size(current_database())) as db_size").catch(() => ({ rows: [{ db_size: 'N/A' }] })),
  ]);

  const data = {
    success: true,
    timestamp: now.toISOString(),
    stats: {
      total_users:        parseInt(users.rows[0]?.total || 0),
      new_users_today:    parseInt(newUsers.rows[0]?.total || 0),
      total_revenue:      parseFloat(revenue.rows[0]?.total || 0),
      active_subs:        parseInt(activeRevenue.rows[0]?.total || 0),
      searches_today:     parseInt(searches.rows[0]?.total || 0),
      code_gens_today:    parseInt(codeGens.rows[0]?.total || 0),
      open_errors:        parseInt(errors.rows[0]?.total || 0),
      pending_submissions:parseInt(pendingSubmissions.rows[0]?.total || 0),
      db_size:            diskUsage.rows[0]?.db_size || 'N/A',
    },
    plan_distribution: planDist.rows,
    recent_users:      recentUsers.rows,
    recent_searches:   recentSearches.rows,
    recent_errors:     recentErrors.rows,
    top_searches:      topSearches.rows,
  };

  await cacheSet('admin:command-center', JSON.stringify(data), 30); // 30s cache
  return res.status(200).json(data);
}

export default withAdminAuth(handler);
