import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import logger from '../../../lib/logger';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  try {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resource, action, ids, params = {} } = req.body || {};

  if (!resource || !action || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: 'resource, action, and ids[] required' });
  }

  // Limit bulk operations to 100 at a time
  if (ids.length > 100) return res.status(400).json({ success: false, error: 'Max 100 items per bulk action' });

  const safeIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
  if (safeIds.length === 0) return res.status(400).json({ success: false, error: 'No valid IDs provided' });

  logger.info(`[admin] Bulk ${resource}.${action} on ${safeIds.length} items by ${req.admin?.username}`);

  // ── USERS ──────────────────────────────────────────────
  if (resource === 'users') {
    if (action === 'change_plan') {
      const { plan } = params;
      if (!['free', 'pro', 'enterprise'].includes(plan)) return res.status(400).json({ success: false, error: 'Invalid plan' });
      const r = await query('UPDATE sn_users SET plan=$1 WHERE id=ANY($2)', [plan, safeIds]);
      return res.status(200).json({ success: true, message: `Updated ${r.rowCount} users to ${plan} plan` });
    }
    if (action === 'ban') {
      const r = await query("UPDATE sn_users SET is_banned=true, ban_reason='Bulk ban by admin' WHERE id=ANY($1)", [safeIds]);
      return res.status(200).json({ success: true, message: `Banned ${r.rowCount} users` });
    }
    if (action === 'unban') {
      const r = await query('UPDATE sn_users SET is_banned=false, ban_reason=null WHERE id=ANY($1)', [safeIds]);
      return res.status(200).json({ success: true, message: `Unbanned ${r.rowCount} users` });
    }
    if (action === 'delete') {
      const r = await query('UPDATE sn_users SET is_active=false WHERE id=ANY($1)', [safeIds]);
      return res.status(200).json({ success: true, message: `Deactivated ${r.rowCount} users` });
    }
  }

  // ── SPOKES ─────────────────────────────────────────────
  if (resource === 'spokes') {
    if (action === 'activate') {
      const r = await query('UPDATE sn_spokes SET is_active=true WHERE id=ANY($1)', [safeIds]);
      return res.status(200).json({ success: true, message: `Activated ${r.rowCount} spokes` });
    }
    if (action === 'deactivate') {
      const r = await query('UPDATE sn_spokes SET is_active=false WHERE id=ANY($1)', [safeIds]);
      return res.status(200).json({ success: true, message: `Deactivated ${r.rowCount} spokes` });
    }
    if (action === 'delete') {
      const r = await query('DELETE FROM sn_spokes WHERE id=ANY($1)', [safeIds]);
      return res.status(200).json({ success: true, message: `Deleted ${r.rowCount} spokes` });
    }
    if (action === 'change_category') {
      const { category } = params;
      if (!category) return res.status(400).json({ success: false, error: 'Category required' });
      const r = await query('UPDATE sn_spokes SET category=$1 WHERE id=ANY($2)', [category, safeIds]);
      return res.status(200).json({ success: true, message: `Updated category for ${r.rowCount} spokes` });
    }
  }

  // ── SUBMISSIONS ────────────────────────────────────────
  if (resource === 'submissions') {
    if (action === 'approve') {
      let count = 0;
      for (const id of safeIds) {
        const sub = await query("UPDATE sn_spoke_submissions SET status='approved', reviewed_at=NOW() WHERE id=$1 AND status='pending' RETURNING *", [id]);
        if (sub.rows[0]) {
          const s = sub.rows[0];
          const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          await query(
            "INSERT INTO sn_spokes (slug,name,description,category,plugin_id,is_active,source) VALUES ($1,$2,$3,$4,$5,true,'community') ON CONFLICT (slug) DO NOTHING",
            [slug, s.name, s.description, s.category, s.plugin_id]
          );
          count++;
        }
      }
      return res.status(200).json({ success: true, message: `Approved ${count} submissions` });
    }
    if (action === 'reject') {
      const r = await query("UPDATE sn_spoke_submissions SET status='rejected', reviewed_at=NOW() WHERE id=ANY($1)", [safeIds]);
      return res.status(200).json({ success: true, message: `Rejected ${r.rowCount} submissions` });
    }
  }

  // ── ERROR LOGS ─────────────────────────────────────────
  if (resource === 'errors') {
    if (action === 'resolve') {
      const r = await query('UPDATE sn_error_logs SET resolved=true, resolved_at=NOW() WHERE id=ANY($1)', [safeIds]);
      return res.status(200).json({ success: true, message: `Resolved ${r.rowCount} errors` });
    }
    if (action === 'delete') {
      const r = await query('DELETE FROM sn_error_logs WHERE id=ANY($1)', [safeIds]);
      return res.status(200).json({ success: true, message: `Deleted ${r.rowCount} error logs` });
    }
  }

  return res.status(400).json({ success: false, error: `Unknown action: ${resource}.${action}` });
  } catch (err) {
    logger.error(`[handler] ${err.message}`);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

export default withAdminAuth(handler);
