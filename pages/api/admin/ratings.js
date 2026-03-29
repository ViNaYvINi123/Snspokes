// Admin: Spoke ratings management
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import logger from '../../../lib/logger';

async function handler(req, res) {
  setSecurityHeaders(res);

  // GET - list all ratings with filters
  if (req.method === 'GET') {
    try {
      const { spoke_slug, min_rating, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      const conditions = ['1=1'];
      const params = [];

      if (spoke_slug) { params.push(spoke_slug); conditions.push(`r.spoke_slug=$${params.length}`); }
      if (min_rating) { params.push(parseInt(min_rating)); conditions.push(`r.rating>=$${params.length}`); }

      const where = conditions.join(' AND ');
      const ratings = await query(`
        SELECT r.*, u.name as user_name, u.email as user_email
        FROM sn_spoke_ratings r
        LEFT JOIN sn_users u ON u.id = r.user_id
        WHERE ${where}
        ORDER BY r.created_at DESC
        LIMIT $${params.length+1} OFFSET $${params.length+2}
      `, [...params, limit, offset]);

      const total = await query(`SELECT COUNT(*) as c FROM sn_spoke_ratings r WHERE ${where}`, params);

      // Top rated spokes
      const topSpokes = await query(`
        SELECT spoke_slug, AVG(rating) as avg_rating, COUNT(*) as count
        FROM sn_spoke_ratings
        GROUP BY spoke_slug ORDER BY avg_rating DESC LIMIT 10
      `);

      return res.status(200).json({
        success: true,
        ratings: ratings.rows,
        total: parseInt(total.rows[0]?.c || 0),
        top_spokes: topSpokes.rows,
      });
    } catch (err) {
      logger.error(`[admin/ratings] ${err.message}`);
      return res.status(500).json({ success: false, error: 'Failed to fetch ratings' });
    }
  }

  // DELETE - remove a rating
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ success: false, error: 'Rating ID required' });
      const r = await query('DELETE FROM sn_spoke_ratings WHERE id=$1 RETURNING spoke_slug', [id]);
      if (r.rows[0]) {
        // Recalculate spoke rating
        await query(`
          UPDATE sn_spokes SET
            rating_avg = (SELECT COALESCE(AVG(rating),0) FROM sn_spoke_ratings WHERE spoke_slug=$1),
            rating_count = (SELECT COUNT(*) FROM sn_spoke_ratings WHERE spoke_slug=$1)
          WHERE slug=$1
        `, [r.rows[0].spoke_slug]);
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // PATCH - reset all ratings for a spoke
  if (req.method === 'PATCH') {
    try {
      const { action, spoke_slug } = req.body;
      if (action === 'reset' && spoke_slug) {
        await query('DELETE FROM sn_spoke_ratings WHERE spoke_slug=$1', [spoke_slug]);
        await query("UPDATE sn_spokes SET rating_avg=0, rating_count=0 WHERE slug=$1", [spoke_slug]);
        return res.status(200).json({ success: true });
      }
      return res.status(400).json({ success: false, error: 'Invalid action' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
