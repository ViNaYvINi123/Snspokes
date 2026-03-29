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
    const r = await query(
      'SELECT b.id, b.spoke_slug, b.created_at, s.name, s.category, s.min_version FROM sn_user_bookmarks b LEFT JOIN sn_spokes s ON s.slug=b.spoke_slug WHERE b.user_id=$1 ORDER BY b.created_at DESC',
      [uid]
    );
    return res.status(200).json({ success: true, data: r.rows });
  }
  if (req.method === 'POST') {
    const { spoke_slug } = req.body || {};
    if (!spoke_slug?.trim()) return res.status(400).json({ success: false, error: 'spoke_slug required' });
    const cleanSlug = sanitizeString(spoke_slug, 255);
    const spoke = await query('SELECT id FROM sn_spokes WHERE slug=$1 AND is_active=true', [cleanSlug]);
    if (spoke.rows.length === 0) return res.status(404).json({ success: false, error: 'Spoke not found' });
    await query('INSERT INTO sn_user_bookmarks (user_id, spoke_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING', [uid, cleanSlug]);
    return res.status(200).json({ success: true });
  }
  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id);
    if (!id) return res.status(400).json({ success: false, error: 'ID required' });
    // IDOR fix: include user_id
    const r = await query('DELETE FROM sn_user_bookmarks WHERE id=$1 AND user_id=$2 RETURNING id', [id, uid]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error: ' + err.message });
  }
}
