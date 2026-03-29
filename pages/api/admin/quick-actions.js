import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { cacheDel } from '../../../lib/redis';
import logger from '../../../lib/logger';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, params = {} } = req.body || {};

  switch (action) {

    case 'clear_cache': {
      // Clear all Redis cache keys
      try {
        await Promise.all([
          cacheDel('admin:command-center'),
          cacheDel('search:*'),
        ]);
        logger.info(`[admin] Cache cleared by ${req.admin?.username}`);
        return res.status(200).json({ success: true, message: 'Cache cleared successfully' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    case 'maintenance_mode': {
      const { enabled } = params;
      await query(
        "INSERT INTO sn_system_properties (name, value, description) VALUES ('maintenance_mode', $1, 'Maintenance mode toggle') ON CONFLICT (name) DO UPDATE SET value=$1, updated_at=NOW()",
        [enabled ? 'true' : 'false']
      );
      logger.info(`[admin] Maintenance mode ${enabled ? 'ON' : 'OFF'} by ${req.admin?.username}`);
      return res.status(200).json({ success: true, message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` });
    }

    case 'resolve_all_errors': {
      const r = await query("UPDATE sn_error_logs SET resolved=true, resolved_at=NOW() WHERE resolved=false");
      logger.info(`[admin] Resolved ${r.rowCount} errors by ${req.admin?.username}`);
      return res.status(200).json({ success: true, message: `Resolved ${r.rowCount} errors` });
    }

    case 'approve_submission': {
      const { id } = params;
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });
      const sub = await query("UPDATE sn_spoke_submissions SET status='approved', reviewed_at=NOW() WHERE id=$1 RETURNING *", [id]);
      if (sub.rows[0]) {
        const s = sub.rows[0];
        const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        await query(
          "INSERT INTO sn_spokes (slug,name,description,category,plugin_id,credential_type,min_version,is_active,source) VALUES ($1,$2,$3,$4,$5,$6,$7,true,'community') ON CONFLICT (slug) DO NOTHING",
          [slug, s.name, s.description, s.category, s.plugin_id, s.credential_type, s.min_version]
        );
      }
      return res.status(200).json({ success: true, message: 'Spoke approved and added to directory' });
    }

    case 'ban_user': {
      const { user_id, reason } = params;
      if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
      await query("UPDATE sn_users SET is_banned=true, ban_reason=$1 WHERE id=$2", [reason || 'Violated terms', user_id]);
      logger.info(`[admin] User ${user_id} banned by ${req.admin?.username}`);
      return res.status(200).json({ success: true, message: 'User banned' });
    }

    case 'trigger_backup': {
      // Log backup request — actual backup runs via shell script
      await query("INSERT INTO sn_backup_logs (status, backup_date, created_at) VALUES ('triggered', $1, NOW())", [new Date().toISOString().split('T')[0]]);
      logger.info(`[admin] Backup triggered by ${req.admin?.username}`);
      return res.status(200).json({ success: true, message: 'Backup triggered. Check server logs for progress.' });
    }

    case 'bulk_email': {
      const { subject, body, plan_filter } = params;
      if (!subject || !body) return res.status(400).json({ success: false, error: 'Subject and body required' });
      const planWhere = plan_filter && plan_filter !== 'all' ? `WHERE plan='${plan_filter}' AND is_active=true` : 'WHERE is_active=true';
      const users = await query(`SELECT email, name FROM sn_users ${planWhere} LIMIT 1000`);
      // Queue emails via n8n
      const { callN8n } = await import('../../../lib/n8n');
      await callN8n('sn-bulk-email', { subject, body, recipients: users.rows });
      logger.info(`[admin] Bulk email to ${users.rows.length} users by ${req.admin?.username}`);
      return res.status(200).json({ success: true, message: `Queued email to ${users.rows.length} users` });
    }

    case 'get_maintenance_status': {
      const r = await query("SELECT value FROM sn_system_properties WHERE name='maintenance_mode'");
      return res.status(200).json({ success: true, maintenance: r.rows[0]?.value === 'true' });
    }

    default:
      return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  }
}

export default withAdminAuth(handler);
