import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    const { view, session_id, limit } = req.query;

    // Live sessions (active in last 5 minutes)
    if (view === 'live') {
      const r = await query(`
        SELECT s.*, u.name as user_name, u.email as user_email, u.plan as user_plan
        FROM sn_chatbot_sessions s
        LEFT JOIN sn_users u ON s.user_id = u.id
        WHERE s.last_active > NOW() - INTERVAL '5 minutes'
        ORDER BY s.last_active DESC
        LIMIT $1
      `, [parseInt(limit) || 50]);
      return res.status(200).json({ success: true, sessions: r.rows, total: r.rows.length });
    }

    // Session messages
    if (view === 'messages' && session_id) {
      const r = await query(
        'SELECT * FROM sn_chatbot_messages WHERE session_id=$1 ORDER BY created_at ASC LIMIT 100',
        [session_id]
      );
      return res.status(200).json({ success: true, messages: r.rows });
    }

    // Stats
    if (view === 'stats') {
      const [total, today, active, avgMsgs] = await Promise.all([
        query('SELECT COUNT(*) as c FROM sn_chatbot_sessions').catch(() => ({ rows: [{ c: 0 }] })),
        query("SELECT COUNT(*) as c FROM sn_chatbot_sessions WHERE started_at > NOW() - INTERVAL '24 hours'").catch(() => ({ rows: [{ c: 0 }] })),
        query("SELECT COUNT(*) as c FROM sn_chatbot_sessions WHERE last_active > NOW() - INTERVAL '5 minutes'").catch(() => ({ rows: [{ c: 0 }] })),
        query('SELECT COALESCE(AVG(message_count),0) as avg FROM sn_chatbot_sessions').catch(() => ({ rows: [{ avg: 0 }] })),
      ]);
      return res.status(200).json({
        success: true,
        stats: {
          total_sessions: parseInt(total.rows[0].c),
          today_sessions: parseInt(today.rows[0].c),
          active_now: parseInt(active.rows[0].c),
          avg_messages: Math.round(parseFloat(avgMsgs.rows[0].avg) * 10) / 10,
        }
      });
    }

    // All sessions (paginated)
    const page = parseInt(req.query.page) || 1;
    const lim = Math.min(parseInt(limit) || 20, 100);
    const offset = (page - 1) * lim;
    const [data, count] = await Promise.all([
      query(`
        SELECT s.*, u.name as user_name, u.email as user_email
        FROM sn_chatbot_sessions s
        LEFT JOIN sn_users u ON s.user_id = u.id
        ORDER BY s.last_active DESC
        LIMIT $1 OFFSET $2
      `, [lim, offset]),
      query('SELECT COUNT(*) as c FROM sn_chatbot_sessions'),
    ]);
    return res.status(200).json({ success: true, sessions: data.rows, total: parseInt(count.rows[0].c), page, pages: Math.ceil(parseInt(count.rows[0].c) / lim) });
  }

  if (req.method === 'DELETE') {
    const { session_id } = req.query;
    if (session_id) {
      await query('DELETE FROM sn_chatbot_messages WHERE session_id=$1', [session_id]);
      await query('DELETE FROM sn_chatbot_sessions WHERE session_id=$1', [session_id]);
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ success: false, error: 'session_id required' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler);
