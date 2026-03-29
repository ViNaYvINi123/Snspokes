import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';

async function handler(req, res) {
  if (req.method !== 'GET') return apiError(res, 'Method not allowed', 405);
  try {
    const [mrr, churn, conversion, topPlan, monthly, failed] = await Promise.allSettled([
      // Current MRR
      query(`SELECT
        SUM(CASE WHEN plan='pro' THEN 999 WHEN plan='team' THEN 2999 ELSE 0 END) as mrr,
        COUNT(CASE WHEN plan='pro' THEN 1 END) as pro_users,
        COUNT(CASE WHEN plan='team' THEN 1 END) as team_users,
        COUNT(CASE WHEN plan='free' THEN 1 END) as free_users,
        COUNT(*) as total_users
       FROM sn_users WHERE is_banned=false`),
      // Churn this month
      query(`SELECT COUNT(*) as churned FROM sn_revenue_events WHERE event_type='churn' AND created_at > NOW() - INTERVAL '30 days'`),
      // Free to paid conversion
      query(`SELECT
        COUNT(*) as total_signups,
        COUNT(CASE WHEN plan!='free' THEN 1 END) as converted
       FROM sn_users WHERE created_at > NOW() - INTERVAL '30 days'`),
      // Plan distribution
      query(`SELECT plan, COUNT(*) as count FROM sn_users GROUP BY plan ORDER BY count DESC`),
      // Monthly revenue trend (last 6 months)
      query(`SELECT
        DATE_TRUNC('month', created_at) as month,
        SUM(amount) as revenue,
        COUNT(*) as transactions
       FROM sn_subscriptions WHERE status='paid'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC LIMIT 6`),
      // Failed payments
      query(`SELECT COUNT(*) as count FROM sn_revenue_events WHERE event_type='payment_failed' AND created_at > NOW() - INTERVAL '30 days'`),
    ]);

    const mrrData = mrr.status === 'fulfilled' ? mrr.value.rows[0] : {};
    const convData = conversion.status === 'fulfilled' ? conversion.value.rows[0] : {};
    const convRate = convData.total_signups > 0 ? ((convData.converted / convData.total_signups) * 100).toFixed(1) : 0;

    return res.status(200).json({
      success: true,
      mrr: {
        amount: parseInt(mrrData.mrr || 0),
        pro_users: parseInt(mrrData.pro_users || 0),
        team_users: parseInt(mrrData.team_users || 0),
        free_users: parseInt(mrrData.free_users || 0),
        total_users: parseInt(mrrData.total_users || 0),
      },
      churn_count: churn.status === 'fulfilled' ? parseInt(churn.value.rows[0].churned) : 0,
      conversion_rate: parseFloat(convRate),
      plan_distribution: topPlan.status === 'fulfilled' ? topPlan.value.rows : [],
      monthly_trend: monthly.status === 'fulfilled' ? monthly.value.rows.reverse() : [],
      failed_payments: failed.status === 'fulfilled' ? parseInt(failed.value.rows[0].count) : 0,
    });
  } catch (err) { return apiError(res, err.message, 500); }
}
export default withAdminAuth(handler);
