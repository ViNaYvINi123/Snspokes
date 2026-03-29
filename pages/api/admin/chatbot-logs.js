// Admin: Chatbot conversation logs
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 50, search } = req.query;
      const offset = (page - 1) * limit;
      const params = [];
      let where = '1=1';
      if (search) { params.push(`%${search}%`); where += ` AND l.question ILIKE $${params.length}`; }

      const logs = await query(`
        SELECT l.*, u.name as user_name, u.email as user_email
        FROM sn_api_logs l
        LEFT JOIN sn_users u ON u.id = l.user_id
        WHERE l.endpoint = '/api/chatbot' AND ${where}
        ORDER BY l.created_at DESC
        LIMIT $${params.length+1} OFFSET $${params.length+2}
      `, [...params, limit, offset]);

      // Stats
      const stats = await query(`
        SELECT
          COUNT(*) as total_chats,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT user_ip) as unique_ips,
          AVG(duration_ms) as avg_duration
        FROM sn_api_logs WHERE endpoint='/api/chatbot'
        AND created_at > NOW() - INTERVAL '7 days'
      `);

      // Most asked questions
      const topQuestions = await query(`
        SELECT question, COUNT(*) as count
        FROM sn_api_logs WHERE endpoint='/api/chatbot' AND question IS NOT NULL
        GROUP BY question ORDER BY count DESC LIMIT 10
      `);

      return res.status(200).json({
        success: true,
        logs: logs.rows,
        stats: stats.rows[0] || {},
        top_questions: topQuestions.rows,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
