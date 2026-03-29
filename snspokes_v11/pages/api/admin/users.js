import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { sanitizePage, apiError, sanitizeString } from '../../../lib/validate';
import logger from '../../../lib/logger';

async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    try {
      const { search = '', plan = '' } = req.query;
      const { page, limit, offset } = sanitizePage(req.query.page, req.query.limit || 20);

      const conditions = ['1=1'];
      const params = [];

      if (search.trim()) {
        params.push(`%${search.trim().toLowerCase()}%`);
        const idx = params.length;
        conditions.push(`(LOWER(name) LIKE $${idx} OR LOWER(email) LIKE $${idx})`);
      }
      if (plan.trim()) {
        params.push(plan.trim());
        conditions.push(`plan = $${params.length}`);
      }

      const where = `WHERE ${conditions.join(' AND ')}`;

      const [countRes, usersRes] = await Promise.all([
        query(`SELECT COUNT(*) as total FROM sn_users ${where}`, params),
        query(
          `SELECT id, name, email, plan, provider, is_banned, ban_reason, search_count, last_login, created_at
           FROM sn_users ${where} ORDER BY created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset]
        ),
      ]);

      return res.status(200).json({
        success: true,
        users: usersRes.rows,
        total: parseInt(countRes.rows[0].total),
        page,
        pages: Math.ceil(parseInt(countRes.rows[0].total) / limit),
      });
    } catch (err) {
      logger.error('[Users GET]', err.message);
      return apiError(res, 'Failed to fetch users', 500, err.message);
    }
  }

  if (method === 'PATCH') {
    try {
      const { id, action, reason, plan } = req.body;
      if (!id) return apiError(res, 'User ID required', 400);
      if (!action) return apiError(res, 'Action required', 400);

      const existing = await query('SELECT id, email FROM sn_users WHERE id = $1', [id]);
      if (existing.rows.length === 0) return apiError(res, 'User not found', 404);

      const validActions = ['ban', 'unban', 'upgrade'];
      if (!validActions.includes(action)) return apiError(res, 'Invalid action', 400);

      if (action === 'ban') {
        await query('UPDATE sn_users SET is_banned=true, ban_reason=$1 WHERE id=$2', [sanitizeString(reason, 500) || 'Violated terms of service', id]);
      } else if (action === 'unban') {
        await query('UPDATE sn_users SET is_banned=false, ban_reason=null WHERE id=$1', [id]);
      } else if (action === 'upgrade') {
        const validPlans = ['free', 'pro', 'team'];
        if (!plan || !validPlans.includes(plan)) return apiError(res, 'Invalid plan', 400);
        await query('UPDATE sn_users SET plan=$1 WHERE id=$2', [plan, id]);
      }

      query('INSERT INTO sn_admin_logs (action, target_type, target_id, details) VALUES ($1,$2,$3,$4)',
        [`${action}_user`, 'user', id.toString(), JSON.stringify({ email: existing.rows[0].email, reason, plan })]
      ).catch(() => {});

      logger.info(`[Users] ${action} on user ${id}`);
      return res.status(200).json({ success: true, message: `User ${action} successful` });

    } catch (err) {
      logger.error('[Users PATCH]', err.message);
      return apiError(res, 'Failed to update user', 500, err.message);
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return apiError(res, 'User ID required', 400);

      const existing = await query('SELECT id, email FROM sn_users WHERE id = $1', [id]);
      if (existing.rows.length === 0) return apiError(res, 'User not found', 404);

      await query('DELETE FROM sn_users WHERE id = $1', [id]);

      query('INSERT INTO sn_admin_logs (action, target_type, target_id, details) VALUES ($1,$2,$3,$4)',
        ['delete_user', 'user', id.toString(), JSON.stringify({ email: existing.rows[0].email })]
      ).catch(() => {});

      logger.info(`[Users] Deleted user ${id}`);
      return res.status(200).json({ success: true, message: 'User deleted successfully' });

    } catch (err) {
      logger.error('[Users DELETE]', err.message);
      return apiError(res, 'Failed to delete user', 500, err.message);
    }
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withAdminAuth(handler);
