import { query } from '../../lib/db';
import { cacheGet, cacheSet } from '../../lib/redis';
import { checkSearchLimit } from '../../lib/plans';
import { withTrace } from '../../lib/requestTrace';
import { sanitizeString, sanitizeSortField, sanitizeInt, setSecurityHeaders } from '../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // Sanitize ALL inputs — prevents SQL injection
  const body = req.method === 'POST' ? (req.body || {}) : {};
  const q        = sanitizeString(req.query.q || body.query || '', 200);
  const bodyCategory = sanitizeString(body.category || '', 50);
  const bodySort = body.sort || '';
  const category = sanitizeString(req.query.category || bodyCategory || '', 50);
  const version  = sanitizeString(req.query.version || '', 50);
  const sort     = sanitizeSortField(req.query.sort, ['relevance', 'popular', 'newest']);
  const page     = sanitizeInt(req.query.page, 1, 1, 100);
  const limit    = 12;
  const offset   = (page - 1) * limit;
  const userId   = req.headers['x-user-id'] || null;
  const ip       = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'anon';

  if (!q.trim() && !category) return res.status(200).json({ success: true, results: [], total: 0, page: 1 });

  const rl = await checkSearchLimit(userId, ip);
  if (!rl.allowed) return res.status(429).json({ success: false, error: rl.message, upgrade_url: '/pricing' });

  const cacheKey = `search:${q}:${category}:${version}:${page}:${sort}`;
  const cached = await cacheGet(cacheKey);
  if (cached) { try { return res.status(200).json({ ...JSON.parse(cached), cached: true }); } catch {} }

  try {
    // All params go through $N placeholders — no string interpolation
    const safeParams = [];
    const conditions = ['s.is_active = true'];

    if (q.trim()) {
      safeParams.push(`%${q.trim()}%`);
      conditions.push(`(s.name ILIKE $${safeParams.length} OR s.description ILIKE $${safeParams.length} OR s.plugin_id ILIKE $${safeParams.length})`);
    }
    if (category) { safeParams.push(category); conditions.push(`s.category = $${safeParams.length}`); }
    if (version)  { safeParams.push(version);  conditions.push(`s.min_version = $${safeParams.length}`); }

    const where   = `WHERE ${conditions.join(' AND ')}`;
    const orderBy = sort === 'newest' ? 's.created_at DESC' : sort === 'popular' ? 's.view_count DESC' : 's.view_count DESC';

    const [countRes, dataRes] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM sn_spokes s ${where}`, safeParams),
      query(`SELECT s.id, s.slug, s.name, s.description, s.category, s.plugin_id, s.credential_type, s.min_version, s.view_count, s.icon, s.tags FROM sn_spokes s ${where} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`, safeParams),
    ]);

    if (q.trim()) query('INSERT INTO sn_search_analytics (query,user_id,results,user_ip) VALUES ($1,$2,$3,$4)', [q.trim().substring(0,200), userId, parseInt(countRes.rows[0].total), ip]).catch(() => {});

    const result = { success: true, results: dataRes.rows, total: parseInt(countRes.rows[0].total), page, pages: Math.ceil(parseInt(countRes.rows[0].total) / limit), query: q.trim(), remaining: rl.remaining };
    await cacheSet(cacheKey, JSON.stringify(result), 300);
    res.setHeader('X-RateLimit-Limit', rl.limit || 50);
    res.setHeader('X-RateLimit-Remaining', rl.remaining || 0);
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ success: false, error: 'Search failed' });
  }
}
export default withTrace(handler);
