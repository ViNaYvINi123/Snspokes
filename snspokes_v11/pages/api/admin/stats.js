import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';

export default withAdminAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [users, searches, spokes, revenue, recentSearches, topSearches, userGrowth, planDist] = await Promise.all([
      // Total users
      query('SELECT COUNT(*) as total, COUNT(CASE WHEN created_at > NOW() - INTERVAL \'30 days\' THEN 1 END) as new_this_month, COUNT(CASE WHEN is_banned = true THEN 1 END) as banned FROM sn_users'),
      // Total searches
      query('SELECT COUNT(*) as total, COUNT(CASE WHEN created_at > NOW() - INTERVAL \'24 hours\' THEN 1 END) as today FROM sn_search_analytics'),
      // Total spokes
      query('SELECT COUNT(*) as total FROM sn_spokes'),
      // Revenue
      query('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM sn_subscriptions WHERE status = \'paid\''),
      // Recent searches (last 10)
      query('SELECT query, results, created_at FROM sn_search_analytics ORDER BY created_at DESC LIMIT 10'),
      // Top searched queries
      query('SELECT query, COUNT(*) as count FROM sn_search_analytics GROUP BY query ORDER BY count DESC LIMIT 10'),
      // User growth last 7 days
      query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM sn_users WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date ASC`),
      // Plan distribution
      query('SELECT plan, COUNT(*) as count FROM sn_users GROUP BY plan'),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        users: {
          total: parseInt(users.rows[0].total),
          new_this_month: parseInt(users.rows[0].new_this_month),
          banned: parseInt(users.rows[0].banned),
        },
        searches: {
          total: parseInt(searches.rows[0].total),
          today: parseInt(searches.rows[0].today),
        },
        spokes: {
          total: parseInt(spokes.rows[0].total),
        },
        revenue: {
          total: parseFloat(revenue.rows[0].total),
          transactions: parseInt(revenue.rows[0].count),
        },
        recent_searches: recentSearches.rows,
        top_searches: topSearches.rows,
        user_growth: userGrowth.rows,
        plan_distribution: planDist.rows,
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
