import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '../../../lib/db';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { setSecurityHeaders } from '../../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');

  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user?.id || null;

  if (req.method === 'GET') {
    try {
      const cacheKey = userId ? `user_memory:${userId}` : null;
      if (cacheKey) {
        const cached = await cacheGet(cacheKey);
        if (cached) {
          try { return res.status(200).json({ success: true, ...JSON.parse(cached) }); } catch {}
        }
      }
      const [history, saved] = await Promise.all([
        userId
          ? query(`SELECT query, results as result_count, created_at FROM sn_search_analytics
                   WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`, [userId])
          : Promise.resolve({ rows: [] }),
        userId
          ? query(`SELECT id, name, query, created_at FROM sn_saved_queries
                   WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`, [userId])
          : Promise.resolve({ rows: [] }),
      ]);
      const data = { history: history.rows, saved: saved.rows };
      if (cacheKey) await cacheSet(cacheKey, JSON.stringify(data), 60).catch(() => {});
      return res.status(200).json({ success: true, ...data });
    } catch {
      return res.status(200).json({ success: true, history: [], saved: [] });
    }
  }

  if (req.method === 'POST') {
    const { action, query: q, result_count, name } = req.body || {};
    if (!userId) return res.status(401).json({ success: false, error: 'Login required' });
    try {
      if (action === 'save_query' && q?.trim()) {
        await query(
          `INSERT INTO sn_saved_queries (user_id, name, query, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [userId, name || q.trim().slice(0, 60), q.trim().slice(0, 300)]
        );
        await cacheSet(`user_memory:${userId}`, '', 1).catch(() => {});
        return res.status(200).json({ success: true });
      }
      if (action === 'delete_saved' && req.body.id) {
        await query('DELETE FROM sn_saved_queries WHERE id=$1 AND user_id=$2', [req.body.id, userId]);
        await cacheSet(`user_memory:${userId}`, '', 1).catch(() => {});
        return res.status(200).json({ success: true });
      }
      return res.status(400).json({ success: false, error: 'Unknown action' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
