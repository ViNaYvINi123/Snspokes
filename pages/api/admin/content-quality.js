import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    try {
      const [quality, missing, lowRated, stale] = await Promise.allSettled([
        // Quality breakdown
        query(`SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN LENGTH(ai_description) > 100 AND array_length(actions::jsonb::text::text[], 1) > 0 THEN 1 END) as complete,
          COUNT(CASE WHEN ai_description IS NULL OR LENGTH(ai_description) < 50 THEN 1 END) as no_content,
          COUNT(CASE WHEN avg_rating < 0 THEN 1 END) as low_rated,
          AVG(quality_score)::int as avg_quality
         FROM sn_spokes`),
        // Missing content
        query(`SELECT id, slug, name, category, ai_description, view_count FROM sn_spokes
               WHERE ai_description IS NULL OR LENGTH(ai_description) < 50
               ORDER BY view_count DESC LIMIT 10`),
        // Low rated
        query(`SELECT id, slug, name, avg_rating, rating_count, view_count FROM sn_spokes
               WHERE rating_count > 2 AND avg_rating < 0
               ORDER BY avg_rating ASC LIMIT 10`),
        // Stale (not updated in 90 days but has views)
        query(`SELECT id, slug, name, view_count, updated_at FROM sn_spokes
               WHERE (updated_at < NOW() - INTERVAL '90 days' OR updated_at IS NULL)
               AND view_count > 10
               ORDER BY view_count DESC LIMIT 10`),
      ]);

      return res.status(200).json({
        success: true,
        overview: quality.status === 'fulfilled' ? quality.value.rows[0] : {},
        missing_content: missing.status === 'fulfilled' ? missing.value.rows : [],
        low_rated: lowRated.status === 'fulfilled' ? lowRated.value.rows : [],
        stale_content: stale.status === 'fulfilled' ? stale.value.rows : [],
      });
    } catch (err) { return apiError(res, err.message, 500); }
  }
  if (req.method === 'PATCH') {
    try {
      const { id, verified, quality_score } = req.body;
      if (!id) return apiError(res, 'ID required', 400);
      await query(
        'UPDATE sn_spokes SET last_verified=NOW(), verified_by=$1, quality_score=$2 WHERE id=$3',
        ['admin', quality_score || 100, id]
      );
      return res.status(200).json({ success: true });
    } catch (err) { return apiError(res, err.message, 500); }
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withAdminAuth(handler);
