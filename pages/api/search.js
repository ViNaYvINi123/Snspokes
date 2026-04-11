import { query } from '../../lib/db';
import { cacheGet, cacheSet, checkRateLimit } from '../../lib/redis';
import { checkSearchLimit } from '../../lib/plans';
import { setSecurityHeaders } from '../../lib/security';
import { withTrace } from '../../lib/requestTrace';
import { askAI } from '../../lib/ai';
import { getAICachedResponse, setAICachedResponse } from '../../lib/aiCache';

// In-memory snippets + methods for instant search
const SNIPPETS = [
  { title: 'GlideRecord Query', desc: 'Query with conditions', code: "var gr = new GlideRecord('incident');\ngr.addQuery('active', true);\ngr.query();\nwhile (gr.next()) gs.info(gr.number);", tags: 'gliderecord query filter' },
  { title: 'Insert Record', desc: 'Create new record', code: "var gr = new GlideRecord('incident');\ngr.initialize();\ngr.short_description = 'New';\ngr.insert();", tags: 'insert create' },
  { title: 'GlideAggregate', desc: 'Count records fast', code: "var ga = new GlideAggregate('incident');\nga.addAggregate('COUNT');\nga.query();\nif (ga.next()) gs.info(ga.getAggregate('COUNT'));", tags: 'aggregate count performance' },
  { title: 'Encoded Query', desc: 'Filter with encoded string', code: "var gr = new GlideRecord('incident');\ngr.addEncodedQuery('active=true^priority=1');\ngr.query();", tags: 'encoded query' },
  { title: 'Business Rule', desc: 'Before insert auto-fill', code: "(function executeRule(current, previous) {\n  current.assigned_to = current.assignment_group.getRefRecord().manager;\n})(current, previous);", tags: 'business rule before' },
  { title: 'Client onChange', desc: 'Show/hide field', code: "function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading) return;\n  g_form.setVisible('u_field', newValue == 'yes');\n}", tags: 'client script onchange' },
  { title: 'REST Outbound', desc: 'Call external API', code: "var rm = new sn_ws.RESTMessageV2('My API', 'POST');\nrm.setRequestBody(JSON.stringify({key: 'val'}));\nvar resp = rm.execute();", tags: 'rest api outbound' },
  { title: 'setWorkflow(false)', desc: 'Skip rules for batch', code: "gr.setWorkflow(false);\ngr.autoSysFields(false);\ngr.update();", tags: 'performance batch' },
];

async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const body = req.method === 'POST' ? (req.body || {}) : {};
  const q = (req.query.q || body.query || '').trim();
  const category = (req.query.category || body.category || '').trim();
  const page = Math.max(1, parseInt(req.query.page || body.page || 1));
  const limit = 12;
  const offset = (page - 1) * limit;
  const userId = req.headers['x-user-id'] || body.user_id || null;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';

  if (!q && !category) return res.status(200).json({ success: true, results: [], snippets: [], total: 0 });

  // Rate limit
  const rl = await checkSearchLimit(userId, ip);
  if (!rl.allowed) return res.status(429).json({ success: false, error: rl.message, upgrade_url: '/pricing' });

  // Cache
  const cacheKey = `search:${q}:${category}:${page}`;
  const cached = await cacheGet(cacheKey);
  if (cached) { try { return res.status(200).json({ ...JSON.parse(cached), cached: true }); } catch {} }

  try {
    // 1. Search spokes (DB)
    const params = []; const conds = ['1=1'];
    if (q) { params.push(`%${q}%`); conds.push(`(s.name ILIKE $${params.length} OR s.description ILIKE $${params.length})`); }
    if (category) { params.push(category); conds.push(`s.category = $${params.length}`); }
    const where = `WHERE ${conds.join(' AND ')}`;

    const [countR, dataR] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM sn_spokes s ${where}`, params),
      query(`SELECT s.id, s.slug, s.name, s.description, s.category, s.icon, s.tags, s.view_count FROM sn_spokes s ${where} ORDER BY s.view_count DESC LIMIT ${limit} OFFSET ${offset}`, params),
    ]);

    // 2. Search snippets (instant, in-memory)
    const matchedSnippets = q ? SNIPPETS.filter(s =>
      s.title.toLowerCase().includes(q.toLowerCase()) || s.desc.toLowerCase().includes(q.toLowerCase()) || s.tags.includes(q.toLowerCase())
    ).slice(0, 3) : [];

    // 3. Search errors (DB)
    let errors = [];
    if (q) {
      try {
        const errR = await query(`SELECT title, description, root_cause, fix_steps, severity FROM sn_error_encyclopedia WHERE error_pattern ILIKE $1 OR title ILIKE $1 LIMIT 2`, [`%${q}%`]);
        errors = errR.rows;
      } catch {}
    }

    // Log search
    if (q) query('INSERT INTO sn_search_analytics (query,user_id,results,user_ip) VALUES ($1,$2,$3,$4)', [q.substring(0, 200), userId, parseInt(countR.rows[0].total), ip]).catch(() => {});

    // 4. AI answer (if search query exists and no cache hit)
    let aiAnswer = null;
    let aiModel = null;
    if (q) {
      try {
        const aiCached = await getAICachedResponse(q, 'search');
        if (aiCached?.answer) {
          aiAnswer = aiCached.answer;
          aiModel  = (aiCached.model || '') + ' (cached)';
        } else {
          const aiResult = await askAI(q, {
            systemPrompt: `You are snspokes AI — a ServiceNow Integration Hub expert.
Answer this developer question concisely. Include relevant code if applicable.
Use markdown: **bold**, \`code\`, \`\`\`js code blocks\`\`\`, bullet lists.`,
            maxTokens: 800,
            timeout: 20000,
          });
          if (aiResult.success) {
            aiAnswer = aiResult.answer;
            aiModel  = aiResult.model;
            setAICachedResponse(q, aiAnswer, aiModel, 'search').catch(() => {});
          }
        }
      } catch {}
    }

    const result = {
      success: true,
      results: dataR.rows,
      snippets: matchedSnippets,
      errors,
      total: parseInt(countR.rows[0].total),
      page, pages: Math.ceil(parseInt(countR.rows[0].total) / limit),
      query: q,
      remaining: rl.remaining,
      ai_answer: aiAnswer,
      ai_model: aiModel,
    };

    await cacheSet(cacheKey, JSON.stringify(result), 300);
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ success: false, error: 'Search failed' });
  }
}
export default withTrace(handler);
