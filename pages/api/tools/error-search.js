import { n8nAnalyzeError } from '../../../lib/n8n';
import { query } from '../../../lib/db';
import { callAI } from '../../../lib/llm';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { withTrace } from '../../../lib/requestTrace';
import { apiError } from '../../../lib/validate';
import { checkRateLimit } from '../../../lib/redis';
import { getClientIp } from '../../../lib/security';

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
        params.push(`%${q.trim().toLowerCase()}%`); params.push(q.trim().toLowerCase());
        conditions.push(`(LOWER(title) LIKE $${params.length-1} OR LOWER(error_pattern) LIKE $${params.length-1} OR LOWER(description) LIKE $${params.length-1} OR similarity(LOWER(title), $${params.length}) > 0.2)`);
      }
      if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
      if (severity) { params.push(severity); conditions.push(`severity = $${params.length}`); }
      const offset = (parseInt(page)-1)*10;
      const where = `WHERE ${conditions.join(' AND ')}`;
      const [countRes, dataRes] = await Promise.all([
        query(`SELECT COUNT(*) as total FROM sn_error_encyclopedia ${where}`, params),
        query(`SELECT * FROM sn_error_encyclopedia ${where} ORDER BY view_count DESC LIMIT 10 OFFSET $${params.length+1}`, [...params, offset]),
      ]);
      if (dataRes.rows.length>0) query(`UPDATE sn_error_encyclopedia SET view_count=view_count+1 WHERE id=ANY($1)`,[dataRes.rows.map(r=>r.id)]).catch(()=>{});
      return res.status(200).json({ success: true, errors: dataRes.rows, total: parseInt(countRes.rows[0].total), query: q.trim() });
    } catch (err) { return apiError(res, 'Search failed: '+err.message, 500); }
  }

  if (req.method === 'POST') {
    const { error_message, context, action } = req.body;

    if (action === 'ai_analyze') {
      if (!error_message?.trim()) return apiError(res, 'error_message required', 400);

      // ── Step 1: Try n8n (OpenRouter + DB lookup combined) ──
      const n8nResult = await n8nAnalyzeError(error_message, context || '');
      if (n8nResult.success) {
        return res.status(200).json({ success: true, ...n8nResult.data, via: 'n8n' });
      }

      // ── Step 2: Fallback to direct AI ──
      const cacheKey = `err_ai:${Buffer.from(error_message).toString('base64').substring(0,40)}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return res.status(200).json({ success: true, source: 'ai_cache', ...cached });
      try {
        const result = await callAI({
          messages: [
            { role: 'system', content: 'ServiceNow error expert. Return ONLY JSON: {"title":"...","description":"...","root_cause":"...","fix_steps":["..."],"category":"Script|API|Flow|DB|Auth|Spoke|Platform","severity":"low|medium|high|critical","prevention":"..."}' },
            { role: 'user', content: `ServiceNow error: "${error_message}"${context ? `\nContext: ${context}` : ''}` },
          ],
        });
        let data;
        try { const c = result.content.replace(/```json|```/g,'').trim(); data = JSON.parse(c.match(/\{[\s\S]*\}/)?.[0]||c); }
        catch { data = { title: 'Error Analysis', description: result.content, root_cause: '', fix_steps: [], category: 'General', severity: 'medium' }; }
        query('INSERT INTO sn_error_encyclopedia (error_pattern,title,description,root_cause,fix_steps,category,severity,source) VALUES ($1,$2,$3,$4,$5,$6,$7,\'ai_generated\') ON CONFLICT DO NOTHING',
          [error_message.trim().substring(0,200), data.title, data.description, data.root_cause, JSON.stringify(data.fix_steps||[]), data.category, data.severity]).catch(()=>{});
        await cacheSet(cacheKey, { ...data, model: result.model }, 7200);
        return res.status(200).json({ success: true, source: 'ai_generated', ...data, model: result.model, via: 'direct' });
      } catch (err) { return apiError(res, 'AI analysis failed: '+err.message, 500); }
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
