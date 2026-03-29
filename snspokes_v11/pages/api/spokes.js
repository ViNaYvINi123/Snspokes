// Missing endpoint - spokes.js page was calling n8n directly
import { query } from '../../lib/db';
import { apiError } from '../../lib/validate';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return apiError(res, 'Method not allowed', 405);

  try {
    const { category = '', search = '' } = req.query;
    const conditions = ['1=1'];
    const params = [];

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(LOWER(name) LIKE $${idx} OR LOWER(description) LIKE $${idx})`);
    }
    if (category.trim() && category !== 'All') {
      params.push(category.trim());
      conditions.push(`category = $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const result = await query(
      `SELECT slug, name, description, icon, category, plugin_id, credential_type, tags, view_count
       FROM sn_spokes ${where} ORDER BY view_count DESC, name ASC`,
      params
    );

    return res.status(200).json({ success: true, spokes: result.rows, count: result.rows.length });
  } catch (err) {
    return apiError(res, 'Failed to fetch spokes', 500, err.message);
  }
}
