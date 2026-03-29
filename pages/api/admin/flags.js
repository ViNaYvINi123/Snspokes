import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { invalidateFlagCache } from '../../../lib/features';
import { apiError } from '../../../lib/validate';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM sn_feature_flags ORDER BY key ASC');
      return res.status(200).json({ success: true, flags: result.rows });
    } catch (err) {
      return apiError(res, 'Failed to fetch flags', 500, err.message);
    }
  }

  if (req.method === 'POST') {
    try {
      const { key, label, description, enabled, rollout_pct, environment } = req.body;
      if (!key?.trim()) return apiError(res, 'Key is required', 400);
      if (!label?.trim()) return apiError(res, 'Label is required', 400);
      const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const result = await query(
        `INSERT INTO sn_feature_flags (key, label, description, enabled, rollout_pct, environment)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [cleanKey, label.trim(), description || '', enabled !== false, parseInt(rollout_pct) || 100, environment || 'all']
      );
      invalidateFlagCache();
      return res.status(201).json({ success: true, flag: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') return apiError(res, 'Flag with this key already exists', 409);
      return apiError(res, 'Failed to create flag', 500, err.message);
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, key, label, description, enabled, rollout_pct, environment } = req.body;
      if (!id) return apiError(res, 'ID required', 400);
      await query(
        `UPDATE sn_feature_flags SET key=$1,label=$2,description=$3,enabled=$4,rollout_pct=$5,environment=$6,updated_at=NOW() WHERE id=$7`,
        [key, label, description || '', enabled !== false, parseInt(rollout_pct) || 100, environment || 'all', id]
      );
      invalidateFlagCache();
      await query('INSERT INTO sn_audit_logs (actor,action,resource,resource_id,new_value) VALUES ($1,$2,$3,$4,$5)',
        ['admin', 'update_flag', 'feature_flag', id.toString(), JSON.stringify({ key, enabled })]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return apiError(res, 'Failed to update flag', 500, err.message);
    }
  }

  if (req.method === 'PATCH') {
    // Quick toggle
    try {
      const { id, enabled } = req.body;
      if (!id) return apiError(res, 'ID required', 400);
      const result = await query('UPDATE sn_feature_flags SET enabled=$1,updated_at=NOW() WHERE id=$2 RETURNING key,enabled', [enabled, id]);
      invalidateFlagCache();
      await query('INSERT INTO sn_audit_logs (actor,action,resource,resource_id,new_value) VALUES ($1,$2,$3,$4,$5)',
        ['admin', enabled ? 'enable_flag' : 'disable_flag', 'feature_flag', id.toString(), JSON.stringify({ enabled })]);
      return res.status(200).json({ success: true, flag: result.rows[0] });
    } catch (err) {
      return apiError(res, 'Failed to toggle flag', 500, err.message);
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return apiError(res, 'ID required', 400);
      await query('DELETE FROM sn_feature_flags WHERE id=$1', [id]);
      invalidateFlagCache();
      return res.status(200).json({ success: true });
    } catch (err) {
      return apiError(res, 'Failed to delete flag', 500, err.message);
    }
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withAdminAuth(handler);
