import { query } from '../../lib/db';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { slug } = req.query;
    try {
      const result = await query(
        `SELECT
          COUNT(CASE WHEN rating=1 THEN 1 END) as upvotes,
          COUNT(CASE WHEN rating=-1 THEN 1 END) as downvotes,
          AVG(rating)::numeric(3,2) as avg_rating
         FROM sn_spoke_ratings sr
         JOIN sn_spokes s ON sr.spoke_id=s.id
         WHERE s.slug=$1`,
        [slug]
      );
      return res.status(200).json({ success: true, ...result.rows[0] });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'POST') {
    const { slug, rating, comment, user_id } = req.body;
    if (!slug || ![1, -1].includes(parseInt(rating))) {
      return res.status(400).json({ error: 'slug and rating (1 or -1) required' });
    }
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    try {
      const spokeRes = await query('SELECT id FROM sn_spokes WHERE slug=$1', [slug]);
      if (!spokeRes.rows.length) return res.status(404).json({ error: 'Spoke not found' });
      const spokeId = spokeRes.rows[0].id;

      await query(
        `INSERT INTO sn_spoke_ratings (spoke_id, user_id, user_ip, rating, comment)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (spoke_id, user_ip) DO UPDATE SET rating=$4, comment=$5`,
        [spokeId, user_id || null, ip, parseInt(rating), comment || '']
      );

      // Update spoke avg rating
      const stats = await query(
        'SELECT AVG(rating)::numeric(3,2) as avg, COUNT(*) as cnt FROM sn_spoke_ratings WHERE spoke_id=$1',
        [spokeId]
      );
      await query('UPDATE sn_spokes SET avg_rating=$1, rating_count=$2 WHERE id=$3',
        [stats.rows[0].avg, stats.rows[0].cnt, spokeId]);

      return res.status(200).json({ success: true, message: rating === 1 ? 'Thanks for the upvote!' : 'Thanks for the feedback!' });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
