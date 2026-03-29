// Admin: Audit log — who did what in admin
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 100, action, target_type } = req.query;
      const offset = (page - 1) * limit;
      const conditions = ['1=1'];
      const params = [];

      if (action) { params.push(action); conditions.push(`action=$${params.length}`); }
      if (target_type) { params.push(target_type); conditions.push(`target_type=$${params.length}`); }

      const where = conditions.join(' AND ');
      const logs = await query(`
        SELECT * FROM sn_audit_logs
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length+1} OFFSET $${params.length+2}
      `, [...params, limit, offset]);

      const total = await query(`SELECT COUNT(*) as c FROM sn_audit_logs WHERE ${where}`, params);
      const actions = await query('SELECT DISTINCT action FROM sn_audit_logs ORDER BY action');

      return res.status(200).json({
        success: true,
        logs: logs.rows,
        total: parseInt(total.rows[0]?.c || 0),
        actions: actions.rows.map(r => r.action),
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
