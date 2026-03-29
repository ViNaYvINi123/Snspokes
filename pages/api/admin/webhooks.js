import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';
import crypto from 'crypto';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    try {
      const { id, events } = req.query;
      if (id && events) {
        const result = await query('SELECT * FROM sn_webhook_events WHERE webhook_id=$1 ORDER BY created_at DESC LIMIT 50', [id]);
        return res.status(200).json({ success: true, events: result.rows });
      }
      const result = await query('SELECT * FROM sn_webhooks ORDER BY created_at DESC');
      return res.status(200).json({ success: true, webhooks: result.rows });
    } catch (err) { return apiError(res, 'Failed', 500, err.message); }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, forward_to, generate_secret } = req.body;
      if (!name?.trim()) return apiError(res, 'Name required', 400);
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-' + Date.now().toString(36);
      const secret = generate_secret ? crypto.randomBytes(32).toString('hex') : null;
      const result = await query(
        'INSERT INTO sn_webhooks (name, slug, description, forward_to, secret) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [name.trim(), slug, description || '', forward_to || null, secret]
      );
      return res.status(201).json({ success: true, webhook: result.rows[0] });
    } catch (err) { return apiError(res, 'Failed to create', 500, err.message); }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, is_active } = req.body;
      await query('UPDATE sn_webhooks SET is_active=$1 WHERE id=$2', [is_active, id]);
      return res.status(200).json({ success: true });
    } catch (err) { return apiError(res, 'Failed', 500, err.message); }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      await query('DELETE FROM sn_webhooks WHERE id=$1', [id]);
      return res.status(200).json({ success: true });
    } catch (err) { return apiError(res, 'Failed', 500, err.message); }
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withAdminAuth(handler);
