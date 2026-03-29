import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';

export default withAdminAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = await query('SELECT * FROM sn_admin_logs ORDER BY created_at DESC LIMIT 100');
    return res.status(200).json({ success: true, logs: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
});
