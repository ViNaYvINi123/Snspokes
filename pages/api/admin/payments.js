import logger from '../../../lib/logger';
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

export default withAdminAuth(async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 20, status = '' } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (status) {
        params.push(status);
        whereClause += ` AND s.status = $${params.length}`;
      }

      const countResult = await query(`SELECT COUNT(*) as total FROM sn_payments s ${whereClause}`, params);
      const paymentsResult = await query(
        `SELECT s.*, u.name as user_name, u.email as user_email, p.name as plan_name
         FROM sn_payments s
         LEFT JOIN sn_users u ON s.user_id = u.id
         LEFT JOIN sn_plans p ON s.plan_id = p.id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      // Revenue summary
      const summary = await query(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_revenue,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
          COALESCE(SUM(CASE WHEN status = 'paid' AND created_at > NOW() - INTERVAL '30 days' THEN amount ELSE 0 END), 0) as monthly_revenue
        FROM sn_payments
      `);

      return res.status(200).json({
        success: true,
        payments: paymentsResult.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        pages: Math.ceil(countResult.rows[0].total / limit),
        summary: summary.rows[0],
      });
    } catch (err) {
      logger.error('Payments error:', err);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
