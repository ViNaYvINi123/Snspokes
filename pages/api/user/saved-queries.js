import { checkRateLimit } from '../../../lib/redis';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '../../../lib/db';
import { sanitizeString, setSecurityHeaders } from '../../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ success: false, error: 'Authentication required' });
  try {
  const uid = session.user.id;

  // Rate limit: 60 req/min per user
  const rl = await checkRateLimit(`user_api:${uid}`, 60, 60);
  if (!rl.allowed) return res.status(429).json({ success: false, error: 'Too many requests. Slow down.' });


  if (req.method === 'GET') {
    const r = await query('SELECT * FROM sn_saved_queries WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [uid]);
    return res.status(200).json({ success: true, data: r.rows });
  }
  if (req.method === 'POST') {
    const { name, query: q, table_name } = req.body || {};
    if (!q?.trim()) return res.status(400).json({ success: false, error: 'Query required' });
    const r = await query(
      'INSERT INTO sn_saved_queries (user_id, name, query, table_name) VALUES ($1,$2,$3,$4) RETURNING *',
      [uid, sanitizeString(name, 100), sanitizeString(q, 2000), sanitizeString(table_name, 100)]
    );
    return res.status(200).json({ success: true, data: r.rows[0] });
  }
  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID required' });
    // IDOR fix: include user_id
    const r = await query('DELETE FROM sn_saved_queries WHERE id=$1 AND user_id=$2 RETURNING id', [id, uid]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error: ' + err.message });
  }
}
