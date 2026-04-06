import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    const r = await query('SELECT * FROM sn_subscribers ORDER BY created_at DESC LIMIT 100');
    const count = await query('SELECT COUNT(*) as c FROM sn_subscribers');
    return res.status(200).json({ success: true, subscribers: r.rows, total: parseInt(count.rows[0].c) });
  }
  if (req.method === 'DELETE') {
    const { id } = req.query;
    await query('DELETE FROM sn_subscribers WHERE id=$1', [id]);
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
export default withAdminAuth(handler);
