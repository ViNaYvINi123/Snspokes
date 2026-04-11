import { askAI } from '../../../lib/ai';
import { query } from '../../../lib/db';
import { cacheGet, cacheSet, checkRateLimit } from '../../../lib/redis';
import { withTrace } from '../../../lib/requestTrace';
import { apiError } from '../../../lib/validate';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — search error encyclopedia
  if (req.method === 'GET') {
    const { q = '', category = '', severity = '', page = 1 } = req.query;
    if (!q.trim() && !category) return res.status(200).json({ success: true, errors: [], total: 0 });
    try {
      const conditions = ['1=1']; const params = [];
      if (q.trim()) {
        params.push('%' + q.trim().toLowerCase() + '%');
        conditions.push(`(LOWER(title) LIKE $${params.length} OR LOWER(error_pattern) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`);
      }
      if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
      if (severity)  { params.push(severity);  conditions.push(`severity = $${params.length}`); }
      const offset = (parseInt(page) - 1) * 10;
      const where = 'WHERE ' + conditions.join(' AND ');
      const [countRes, dataRes] = await Promise.all([
        query(`SELECT COUNT(*) as total FROM sn_error_encyclopedia ${where}`, params),
        query(`SELECT * FROM sn_error_encyclopedia ${where} ORDER BY view_count DESC LIMIT 10 OFFSET $${params.length + 1}`, [...params, offset]),
      ]);
      if (dataRes.rows.length > 0) query('UPDATE sn_error_encyclopedia SET view_count=view_count+1 WHERE id=ANY($1)', [dataRes.rows.map(r => r.id)]).catch(() => {});
      return res.status(200).json({ success: true, errors: dataRes.rows, total: parseInt(countRes.rows[0].total), query: q.trim() });
    } catch (err) { return apiError(res, 'Search failed: ' + err.message, 500); }
  }

  // POST — AI analysis
  if (req.method === 'POST') {
    const { error_message, context, action, id } = req.body;

    if (action === 'helpful') {
      await query('UPDATE sn_error_encyclopedia SET helpful_count=helpful_count+1 WHERE id=$1', [id]).catch(() => {});
      return res.status(200).json({ success: true });
    }

    if (action === 'ai_analyze') {
      if (!error_message?.trim()) return apiError(res, 'error_message required', 400);

      const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'anon';
      const rl = await checkRateLimit('error_ai:' + ip, 10, 60);
      if (!rl.allowed) return res.status(429).json({ success: false, error: 'Rate limit exceeded' });

      const cacheKey = 'error_ai:' + error_message.trim().substring(0, 100).replace(/\s+/g, '_');
      const cached = await cacheGet(cacheKey);
      if (cached) {
        try { return res.status(200).json({ success: true, ...JSON.parse(cached), cached: true }); } catch {}
      }

      const aiResult = await askAI(
        `Analyze this ServiceNow error:\n\n${error_message}${context ? '\n\nContext: ' + context : ''}`,
        {
          systemPrompt: `You are a ServiceNow debugging expert. For any error, provide:
1. **Root Cause** — exactly what caused this
2. **Fix** — numbered steps to resolve it
3. **Prevention** — how to avoid it in future
Use markdown. Be specific and practical.`,
          maxTokens: 1000,
        }
      );

      if (aiResult.success) {
        const data = { analysis: aiResult.answer, model: aiResult.model };
        await cacheSet(cacheKey, JSON.stringify(data), 7200);
        return res.status(200).json({ success: true, ...data });
      }
      return res.status(200).json({ success: false, error: 'AI analysis temporarily unavailable.' });
    }

    return apiError(res, 'Unknown action', 400);
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withTrace(handler);
