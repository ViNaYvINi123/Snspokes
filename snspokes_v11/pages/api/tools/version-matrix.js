import { query } from '../../../lib/db';
import { withTrace } from '../../../lib/requestTrace';
import { apiError } from '../../../lib/validate';

const SN_VERSIONS = ['New York','Orlando','Paris','Quebec','Rome','San Diego','Tokyo','Utah','Vancouver','Washington','Xanadu','Yokohama'];

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { q = '', type = '', version = '' } = req.query;
    try {
      const conditions = ['1=1'];
      const params = [];
      if (q.trim()) {
        params.push(`%${q.trim().toLowerCase()}%`);
        conditions.push(`(LOWER(feature_name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`);
      }
      if (type) { params.push(type); conditions.push(`feature_type = $${params.length}`); }

      const result = await query(
        `SELECT * FROM sn_version_matrix WHERE ${conditions.join(' AND ')} ORDER BY category, feature_name LIMIT 50`,
        params
      );

      return res.status(200).json({
        success: true,
        features: result.rows,
        versions: SN_VERSIONS,
        total: result.rows.length,
      });
    } catch (err) {
      return apiError(res, err.message, 500);
    }
  }
  return apiError(res, 'Method not allowed', 405);
}

export default withTrace(handler);
