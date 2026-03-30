import { n8nAnalyzeError } from '../../../lib/n8n';
import { query } from '../../../lib/db';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { withTrace } from '../../../lib/requestTrace';
import { apiError } from '../../../lib/validate';
import { checkRateLimit } from '../../../lib/redis';
import { getClientIp, setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { q = '', category = '', severity = '', page = 1 } = req.query;
    if (!q.trim() && !category) return res.status(200).json({ success: true, errors: [], total: 0 });
    try {
      const conditions = ['1=1']; const params = [];
      if (q.trim()) {
        params.push('%' + q.trim().toLowerCase() + '%');
        conditions.push('(LOWER(title) LIKE $' + params.length + ' OR LOWER(error_pattern) LIKE $' + params.length + ' OR LOWER(description) LIKE $' + params.length + ')');
      }
      if (category) { params.push(category); conditions.push('category = $' + params.length); }
      if (severity) { params.push(severity); conditions.push('severity = $' + params.length); }
      const offset = (parseInt(page) - 1) * 10;
      const where = 'WHERE ' + conditions.join(' AND ');
      const [countRes, dataRes] = await Promise.all([
        query('SELECT COUNT(*) as total FROM sn_error_encyclopedia ' + where, params),
        query('SELECT * FROM sn_error_encyclopedia ' + where + ' ORDER BY view_count DESC LIMIT 10 OFFSET $' + (params.length + 1), [...params, offset]),
      ]);
      if (dataRes.rows.length > 0) query('UPDATE sn_error_encyclopedia SET view_count=view_count+1 WHERE id=ANY($1)', [dataRes.rows.map(r => r.id)]).catch(() => {});
      return res.status(200).json({ success: true, errors: dataRes.rows, total: parseInt(countRes.rows[0].total), query: q.trim() });
    } catch (err) { return apiError(res, 'Search failed: ' + err.message, 500); }
  }

  if (req.method === 'POST') {
    const { error_message, context, action } = req.body;

    if (action === 'ai_analyze') {
      if (!error_message?.trim()) return apiError(res, 'error_message required', 400);

      const cacheKey = 'error_ai:' + error_message.trim().substring(0, 100).replace(/\s+/g, '_');
      const cached = await cacheGet(cacheKey);
      if (cached) {
        try { return res.status(200).json({ success: true, ...JSON.parse(cached), cached: true }); } catch {}
      }

      // All AI goes through n8n
      const n8nResult = await n8nAnalyzeError(error_message, context || '');
      if (n8nResult.success && n8nResult.data) {
        await cacheSet(cacheKey, JSON.stringify(n8nResult.data), 7200);
        return res.status(200).json({ success: true, ...n8nResult.data, via: 'n8n' });
      }

      return res.status(200).json({ success: false, error: 'AI analysis unavailable. Check n8n error-analyzer workflow is active.' });
    }

    if (action === 'helpful') {
      const { id } = req.body;
      await query('UPDATE sn_error_encyclopedia SET helpful_count=helpful_count+1 WHERE id=$1', [id]);
      return res.status(200).json({ success: true });
    }
    return apiError(res, 'Unknown action', 400);
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withTrace(handler);
