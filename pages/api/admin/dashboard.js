import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [users, spokes, searches, errors, revenue] = await Promise.all([
      query('SELECT COUNT(*) as total FROM sn_users').catch(() => ({ rows: [{ total: 0 }] })),
      query('SELECT COUNT(*) as total FROM sn_spokes WHERE is_active=true').catch(() => ({ rows: [{ total: 0 }] })),
      query("SELECT COUNT(*) as total FROM sn_search_analytics WHERE created_at > NOW()-INTERVAL '24h'").catch(() => ({ rows: [{ total: 0 }] })),
      query("SELECT COUNT(*) as total FROM sn_error_logs WHERE resolved=false").catch(() => ({ rows: [{ total: 0 }] })),
      query("SELECT COALESCE(SUM(amount),0) as total FROM sn_payments WHERE status='active'").catch(() => ({ rows: [{ total: 0 }] })),
    ]);
    return res.status(200).json({
      success: true,
      stats: {
        total_users: parseInt(users.rows[0]?.total || 0),
        total_spokes: parseInt(spokes.rows[0]?.total || 0),
        searches_today: parseInt(searches.rows[0]?.total || 0),
        open_errors: parseInt(errors.rows[0]?.total || 0),
        total_revenue: parseFloat(revenue.rows[0]?.total || 0),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export default withAdminAuth(handler);
