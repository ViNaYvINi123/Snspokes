// Admin: Churn analytics — who cancelled, why, forecasting
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    try {
      const [churnedUsers, churnReasons, retentionCohort, mrrGrowth, atRisk] = await Promise.allSettled([
        // Users who cancelled in last 30 days
        query(`
          SELECT u.id, u.name, u.email, u.created_at,
                 p.created_at as subscribed_at, p.updated_at as cancelled_at,
                 EXTRACT(DAY FROM p.updated_at - p.created_at) as days_subscribed
          FROM sn_payments p
          JOIN sn_users u ON u.id = p.user_id
          WHERE p.status IN ('cancelled','refunded')
          AND p.updated_at > NOW() - INTERVAL '30 days'
          ORDER BY p.updated_at DESC LIMIT 50
        `),
        // Churn reasons from sn_revenue_events
        query(`
          SELECT details->>'reason' as reason, COUNT(*) as count
          FROM sn_revenue_events
          WHERE event_type='churn' AND created_at > NOW() - INTERVAL '90 days'
          GROUP BY reason ORDER BY count DESC
        `),
        // Monthly retention: new users vs retained
        query(`
          SELECT
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as new_users,
            COUNT(*) FILTER (WHERE last_login > created_at + INTERVAL '30 days') as retained_30d
          FROM sn_users
          WHERE created_at > NOW() - INTERVAL '6 months'
          GROUP BY month ORDER BY month ASC
        `),
        // MRR trend last 6 months
        query(`
          SELECT
            DATE_TRUNC('month', created_at) as month,
            SUM(amount) as mrr,
            COUNT(*) as new_subs
          FROM sn_payments
          WHERE status='active'
          AND created_at > NOW() - INTERVAL '6 months'
          GROUP BY month ORDER BY month ASC
        `),
        // At-risk users: paid but haven't used in 14 days
        query(`
          SELECT u.id, u.name, u.email, u.plan, u.last_login,
                 EXTRACT(DAY FROM NOW() - u.last_login) as days_inactive
          FROM sn_users u
          WHERE u.plan IN ('pro','enterprise')
          AND (u.last_login < NOW() - INTERVAL '14 days' OR u.last_login IS NULL)
          ORDER BY days_inactive DESC LIMIT 20
        `),
      ]);

      return res.status(200).json({
        success: true,
        churned_users:   churnedUsers.status   === 'fulfilled' ? churnedUsers.value.rows   : [],
        churn_reasons:   churnReasons.status   === 'fulfilled' ? churnReasons.value.rows   : [],
        retention_cohort:retentionCohort.status=== 'fulfilled' ? retentionCohort.value.rows: [],
        mrr_growth:      mrrGrowth.status      === 'fulfilled' ? mrrGrowth.value.rows      : [],
        at_risk_users:   atRisk.status         === 'fulfilled' ? atRisk.value.rows         : [],
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST: record churn reason
  if (req.method === 'POST') {
    try {
      const { user_id, reason } = req.body;
      await query(
        "INSERT INTO sn_revenue_events (user_id, event_type, details) VALUES ($1,'churn',$2)",
        [user_id, JSON.stringify({ reason })]
      );
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
