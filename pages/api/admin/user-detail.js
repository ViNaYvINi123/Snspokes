// Admin: Full user detail — activity timeline, notes, impersonation
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import jwt from 'jsonwebtoken';
import logger from '../../../lib/logger';

async function handler(req, res) {
  setSecurityHeaders(res);

  // GET - full user detail with activity timeline
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'User ID required' });

      const [user, searches, codeGens, bookmarks, payments, savedQueries, notes, apiKeys, loginHistory] = await Promise.all([
        query('SELECT * FROM sn_users WHERE id=$1', [id]),
        query('SELECT query, results, created_at FROM sn_search_analytics WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [id]),
        query('SELECT code_type, prompt, created_at FROM sn_code_generations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [id]),
        query('SELECT spoke_slug, created_at FROM sn_user_bookmarks WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [id]),
        query("SELECT plan, amount, status, created_at FROM sn_payments WHERE user_id=$1 ORDER BY created_at DESC", [id]),
        query('SELECT name, query, table_name, created_at FROM sn_saved_queries WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10', [id]),
        query('SELECT note, created_by, created_at FROM sn_admin_notes WHERE user_id=$1 ORDER BY created_at DESC', [id]),
        query("SELECT name, last_used, created_at FROM sn_api_keys WHERE user_id=$1 AND is_active=true", [id]),
        query('SELECT ip_address, success, created_at FROM sn_login_attempts WHERE email=(SELECT email FROM sn_users WHERE id=$1) ORDER BY created_at DESC LIMIT 10', [id]),
      ]);

      if (!user.rows[0]) return res.status(404).json({ success: false, error: 'User not found' });

      // Build activity timeline
      const timeline = [
        ...searches.rows.map(r => ({ type: 'search',   icon: '🔍', label: r.query,          meta: `${r.results} results`, time: r.created_at })),
        ...codeGens.rows.map(r => ({ type: 'codegen',  icon: '💻', label: r.code_type,      meta: r.prompt?.substring(0,60)+'...', time: r.created_at })),
        ...bookmarks.rows.map(r => ({ type: 'bookmark',icon: '🔖', label: r.spoke_slug,      meta: 'bookmarked spoke', time: r.created_at })),
        ...payments.rows.map(r => ({ type: 'payment',  icon: '💳', label: `${r.plan} plan`,  meta: `₹${r.amount}`, time: r.created_at })),
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 50);

      return res.status(200).json({
        success: true,
        user: { ...user.rows[0], password_hash: undefined },
        timeline,
        saved_queries: savedQueries.rows,
        api_keys: apiKeys.rows,
        admin_notes: notes.rows,
        login_history: loginHistory.rows,
        stats: {
          total_searches: searches.rows.length,
          total_code_gens: codeGens.rows.length,
          total_bookmarks: bookmarks.rows.length,
          total_payments: payments.rows.length,
        },
      });
    } catch (err) {
      logger.error(`[admin/user-detail] ${err.message}`);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST - add admin note
  if (req.method === 'POST') {
    try {
      const { action, user_id, note, admin_username } = req.body;
      if (action === 'add_note') {
        if (!user_id || !note) return res.status(400).json({ success: false, error: 'user_id and note required' });
        await query(
          'INSERT INTO sn_admin_notes (user_id, note, created_by) VALUES ($1,$2,$3)',
          [user_id, note.substring(0, 1000), admin_username || 'admin']
        );
        return res.status(200).json({ success: true });
      }
      // Impersonate user — generate short-lived JWT
      if (action === 'impersonate') {
        const { user_id: uid } = req.body;
        const user = await query('SELECT id, email, name, plan FROM sn_users WHERE id=$1 AND is_active=true', [uid]);
        if (!user.rows[0]) return res.status(404).json({ success: false, error: 'User not found' });
        const impersonateToken = jwt.sign(
          { id: uid, email: user.rows[0].email, name: user.rows[0].name, plan: user.rows[0].plan, impersonated: true },
          process.env.NEXTAUTH_SECRET,
          { expiresIn: '1h' }
        );
        logger.warn(`[admin] Impersonating user ${uid} (${user.rows[0].email})`);
        await query(`INSERT INTO sn_audit_logs (admin, action, target_type, target_id, details) VALUES ($1,'impersonate','user',$2,$3)`,
          ['admin', uid, JSON.stringify({ email: user.rows[0].email })]);
        return res.status(200).json({ success: true, token: impersonateToken, user: user.rows[0] });
      }
      return res.status(400).json({ success: false, error: 'Invalid action' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'PUT') {
    const { id } = req.query;
    const { name, email, plan, role, is_banned, ban_reason } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'User ID required' });
    await query('UPDATE sn_users SET name=COALESCE($1,name), email=COALESCE($2,email), plan=COALESCE($3,plan), role=COALESCE($4,role), is_banned=COALESCE($5,is_banned), ban_reason=COALESCE($6,ban_reason), updated_at=NOW() WHERE id=$7',
      [name, email, plan, role, is_banned, ban_reason, id]);
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
