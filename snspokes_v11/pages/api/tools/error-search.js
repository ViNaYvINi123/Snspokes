import { query } from '../../../lib/db';
import { callAI } from '../../../lib/llm';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { withTrace } from '../../../lib/requestTrace';
import { apiError } from '../../../lib/validate';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: search errors
  if (req.method === 'GET') {
    const { q = '', category = '', severity = '', page = 1 } = req.query;
    if (!q.trim() && !category) return res.status(200).json({ success: true, errors: [], total: 0 });

    try {
      const conditions = ['1=1'];
      const params = [];

      if (q.trim()) {
        params.push(`%${q.trim().toLowerCase()}%`);
        const idx = params.length;
        conditions.push(`(LOWER(title) LIKE $${idx} OR LOWER(error_pattern) LIKE $${idx} OR LOWER(description) LIKE $${idx} OR similarity(LOWER(title), $${idx + 1}) > 0.2)`);
        params.push(q.trim().toLowerCase());
      }
      if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
      if (severity) { params.push(severity); conditions.push(`severity = $${params.length}`); }

      const offset = (parseInt(page) - 1) * 10;
      const where = `WHERE ${conditions.join(' AND ')}`;

      const [countRes, dataRes] = await Promise.all([
        query(`SELECT COUNT(*) as total FROM sn_error_encyclopedia ${where}`, params),
        query(`SELECT * FROM sn_error_encyclopedia ${where} ORDER BY view_count DESC, helpful_count DESC LIMIT 10 OFFSET $${params.length + 1}`, [...params, offset]),
      ]);

      // Update view counts async
      if (dataRes.rows.length > 0) {
        const ids = dataRes.rows.map(r => r.id);
        query(`UPDATE sn_error_encyclopedia SET view_count=view_count+1 WHERE id=ANY($1)`, [ids]).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        errors: dataRes.rows,
        total: parseInt(countRes.rows[0].total),
        query: q.trim(),
      });
    } catch (err) {
      return apiError(res, 'Search failed: ' + err.message, 500);
    }
  }

  // POST: AI analyze error
  if (req.method === 'POST') {
    const { error_message, context, action } = req.body;

    if (action === 'ai_analyze') {
      if (!error_message?.trim()) return apiError(res, 'error_message required', 400);

      // Check DB first
      try {
        const dbResult = await query(
          `SELECT * FROM sn_error_encyclopedia WHERE LOWER(error_pattern) LIKE $1 OR LOWER(title) LIKE $1 ORDER BY verified DESC LIMIT 3`,
          [`%${error_message.trim().toLowerCase().substring(0, 50)}%`]
        );
        if (dbResult.rows.length > 0) {
          return res.status(200).json({ success: true, source: 'encyclopedia', errors: dbResult.rows, ai_needed: false });
        }
      } catch {}

      // Use AI
      const cacheKey = `err_ai:${Buffer.from(error_message).toString('base64').substring(0, 40)}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return res.status(200).json({ success: true, source: 'ai_cache', ...cached });

      try {
        const result = await callAI({
          messages: [
            {
              role: 'system',
              content: `You are a ServiceNow error resolution expert. When given an error, return ONLY this JSON:
{
  "title": "short error name",
  "description": "what this error means",
  "root_cause": "why this happens",
  "fix_steps": ["step 1", "step 2", "step 3"],
  "category": "Script|API|Flow|DB|Auth|Spoke|Platform",
  "severity": "low|medium|high|critical",
  "related_docs": ["relevant SN docs or KB articles if you know them"],
  "prevention": "how to avoid this in future"
}`,
            },
            { role: 'user', content: `ServiceNow error: "${error_message}"${context ? `\n\nContext: ${context}` : ''}` },
          ],
        });

        let data;
        try {
          const clean = result.content.replace(/```json|```/g, '').trim();
          data = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
        } catch {
          data = { title: 'Error Analysis', description: result.content, root_cause: '', fix_steps: [], category: 'General', severity: 'medium' };
        }

        // Auto-save to encyclopedia
        query(
          `INSERT INTO sn_error_encyclopedia (error_pattern, title, description, root_cause, fix_steps, category, severity, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'ai_generated')
           ON CONFLICT DO NOTHING`,
          [error_message.trim().substring(0, 200), data.title, data.description, data.root_cause, JSON.stringify(data.fix_steps || []), data.category, data.severity]
        ).catch(() => {});

        await cacheSet(cacheKey, { ...data, model: result.model }, 7200);
        return res.status(200).json({ success: true, source: 'ai_generated', ...data, model: result.model });
      } catch (err) {
        return apiError(res, 'AI analysis failed: ' + err.message, 500);
      }
    }

    // Mark helpful
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
