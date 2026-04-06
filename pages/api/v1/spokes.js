import { withAPIGateway } from '../../../lib/apiGateway';
import { query } from '../../../lib/db';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  const { search, category, page = 1, limit = 20 } = req.query;
  const lim = Math.min(parseInt(limit) || 20, 100);
  const offset = (Math.max(1, parseInt(page)) - 1) * lim;
  const params = []; const conds = [];

  if (search?.trim()) { params.push(`%${search.trim()}%`); conds.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`); }
  if (category?.trim()) { params.push(category.trim()); conds.push(`category = $${params.length}`); }

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const [countR, dataR] = await Promise.all([
    query(`SELECT COUNT(*) as c FROM sn_spokes ${where}`, params),
    query(`SELECT slug, name, description, category, icon, tags, credential_type, min_version, view_count FROM sn_spokes ${where} ORDER BY view_count DESC LIMIT ${lim} OFFSET ${offset}`, params),
  ]);

  return res.status(200).json({
    data: { spokes: dataR.rows, total: parseInt(countR.rows[0].c), page: parseInt(page), pages: Math.ceil(parseInt(countR.rows[0].c) / lim) },
    meta: { request_id: req.apiContext?.requestId },
  });
}
export default withAPIGateway(handler, { cacheTTL: 300 });
