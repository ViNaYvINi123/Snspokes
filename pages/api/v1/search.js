import { withAPIGateway } from '../../../lib/apiGateway';
import { query } from '../../../lib/db';
import { askAI } from '../../../lib/ai';
import { getAICachedResponse, setAICachedResponse } from '../../../lib/aiCache';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } });
  const { query: q, category, page = 1, include_ai = true } = req.body || {};
  if (!q?.trim()) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'query field required' } });

  const limit = 12;
  const offset = (Math.max(1, parseInt(page)) - 1) * limit;
  const params = [`%${q.trim()}%`];
  let where = 'WHERE (name ILIKE $1 OR description ILIKE $1)';
  if (category) { params.push(category); where += ` AND category = $${params.length}`; }

  const [countR, dataR] = await Promise.all([
    query(`SELECT COUNT(*) as total FROM sn_spokes ${where}`, params),
    query(`SELECT slug, name, description, category, icon, tags, view_count FROM sn_spokes ${where} ORDER BY view_count DESC LIMIT ${limit} OFFSET ${offset}`, params),
  ]);

  let ai_answer = null;
  if (include_ai && q.trim()) {
    const cached = await getAICachedResponse(q.trim(), 'v1search');
    if (cached?.answer) { ai_answer = { answer: cached.answer, model: cached.model, cached: true }; }
    else {
      const ai = await askAI(q.trim(), { maxTokens: 800, timeout: 15000 });
      if (ai.success) { ai_answer = { answer: ai.answer, model: ai.model }; setAICachedResponse(q.trim(), ai.answer, ai.model, 'v1search').catch(() => {}); }
    }
  }

  return res.status(200).json({
    data: { results: dataR.rows, ai_answer, total: parseInt(countR.rows[0].total), page: parseInt(page), pages: Math.ceil(parseInt(countR.rows[0].total) / limit) },
    meta: { plan: req.apiContext?.plan, request_id: req.apiContext?.requestId },
  });
}
export default withAPIGateway(handler, { cacheTTL: 60 });
