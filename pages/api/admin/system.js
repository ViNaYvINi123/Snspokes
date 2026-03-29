import { withAdminAuth } from '../../../lib/adminAuth';
import { getCacheStats, getTrending, getRecentQueries } from '../../../lib/redis';
import { getQueueStats } from '../../../lib/queue';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

export default withAdminAuth(async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [cacheStats, queueStats, trending, recentQueries] = await Promise.allSettled([
      getCacheStats(),
      getQueueStats(),
      getTrending(10),
      getRecentQueries(20),
    ]);

    // Get system metrics from DB
    const [userCount, spokeCount, searchCount, revenueCount] = await Promise.allSettled([
      query('SELECT COUNT(*) as c FROM sn_users'),
      query('SELECT COUNT(*) as c FROM sn_spokes'),
      query("SELECT COUNT(*) as total, COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as today FROM sn_search_analytics"),
      query("SELECT COALESCE(SUM(amount),0) as total FROM sn_payments WHERE status='paid'"),
    ]);

    return res.status(200).json({
      success: true,
      redis: cacheStats.status === 'fulfilled' ? cacheStats.value : { connected: false },
      queue: queueStats.status === 'fulfilled' ? queueStats.value : null,
      trending: trending.status === 'fulfilled' ? trending.value : [],
      recent_queries: recentQueries.status === 'fulfilled' ? recentQueries.value : [],
      metrics: {
        users: userCount.status === 'fulfilled' ? parseInt(userCount.value.rows[0].c) : 0,
        spokes: spokeCount.status === 'fulfilled' ? parseInt(spokeCount.value.rows[0].c) : 0,
        searches_total: searchCount.status === 'fulfilled' ? parseInt(searchCount.value.rows[0].total) : 0,
        searches_today: searchCount.status === 'fulfilled' ? parseInt(searchCount.value.rows[0].today) : 0,
        revenue: revenueCount.status === 'fulfilled' ? parseFloat(revenueCount.value.rows[0].total) : 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
