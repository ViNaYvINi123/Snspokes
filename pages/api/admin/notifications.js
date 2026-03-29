import { withAdminAuth } from '../../../lib/adminAuth';
import { getNotifications, getUnreadCount, markAllRead, query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    try {
      const { unread } = req.query;
      const [notifs, count] = await Promise.all([
        query(`SELECT * FROM sn_admin_notifications ${unread === 'true' ? 'WHERE read=false' : ''} ORDER BY created_at DESC LIMIT 30`),
        query('SELECT COUNT(*) as count FROM sn_admin_notifications WHERE read=false'),
      ]);
      return res.status(200).json({ success: true, notifications: notifs.rows, unread_count: parseInt(count.rows[0].count) });
    } catch (err) { return apiError(res, err.message, 500); }
  }
  if (req.method === 'PATCH') {
    try {
      await query('UPDATE sn_admin_notifications SET read=true WHERE read=false');
      return res.status(200).json({ success: true });
    } catch (err) { return apiError(res, err.message, 500); }
  }
  if (req.method === 'DELETE') {
    try {
      await query('DELETE FROM sn_admin_notifications WHERE read=true');
      return res.status(200).json({ success: true });
    } catch (err) { return apiError(res, err.message, 500); }
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withAdminAuth(handler);
