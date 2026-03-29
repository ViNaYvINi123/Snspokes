import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM sn_announcements ORDER BY created_at DESC');
      return res.status(200).json({ success: true, announcements: result.rows });
    } catch (err) { return apiError(res, err.message, 500); }
  }
  if (req.method === 'POST') {
    try {
      const { title, message, type, target, cta_text, cta_url, ends_at } = req.body;
      if (!title?.trim() || !message?.trim()) return apiError(res, 'Title and message required', 400);
      const result = await query(
        'INSERT INTO sn_announcements (title,message,type,target,cta_text,cta_url,ends_at,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING *',
        [title.trim(), message.trim(), type||'info', target||'all', cta_text||null, cta_url||null, ends_at||null]
      );
      return res.status(201).json({ success: true, announcement: result.rows[0] });
    } catch (err) { return apiError(res, err.message, 500); }
  }
  if (req.method === 'PATCH') {
    try {
      const { id, is_active } = req.body;
      await query('UPDATE sn_announcements SET is_active=$1 WHERE id=$2', [is_active, id]);
      return res.status(200).json({ success: true });
    } catch (err) { return apiError(res, err.message, 500); }
  }
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      await query('DELETE FROM sn_announcements WHERE id=$1', [id]);
      return res.status(200).json({ success: true });
    } catch (err) { return apiError(res, err.message, 500); }
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withAdminAuth(handler);
