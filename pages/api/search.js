/**
 * snspokes Search API — DB-first, trending, suggestions, personalization
 *
 * Modes:
 *  trending=1               → top searches last 24h
 *  suggest=1&q=xxx          → autocomplete from spokes + recent
 *  query=xxx                → full search (DB → AI fallback)
 */

import { searchAll }                                       from '../../lib/search';
import { answerFromSpoke, answerFromAPI, answerFromContext } from '../../lib/answer';
import { askAI }                                           from '../../lib/ai';
import { query }                                           from '../../lib/db';
import { cacheGet, cacheSet }                              from '../../lib/redis';
import { setSecurityHeaders }                              from '../../lib/security';

const HIGH_CONFIDENCE = 0.05;

function detectIntent(q) {
  const ql = q.toLowerCase();
  if (/error|exception|failed|cannot|undefined|null|4\d\d|5\d\d|invalid|restricted|denied/.test(ql)) return 'error';
  if (/vs|versus|difference|compare|when to use|which/.test(ql))                                     return 'compare';
  if (/code|script|write|create|build|example|business rule/.test(ql))                               return 'code';
  return 'explain';
}

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const body = req.method === 'POST' ? req.body : req.query;

  // ── Trending ──────────────────────────────────────────────────────────────
  if (body.trending === '1' || body.trending === true) {
    try {
      const cached = await cacheGet('trending:24h');
      if (cached) return res.status(200).json({ trending: JSON.parse(cached) });
    } catch {}

    try {
      const r = await query(
        `SELECT query, COUNT(*) as count
         FROM sn_search_analytics
         WHERE created_at > NOW() - INTERVAL '24 hours'
           AND results > 0
           AND LENGTH(query) > 3
         GROUP BY query ORDER BY count DESC LIMIT 8`
      );
      const trending = r.rows;
      try { await cacheSet('trending:24h', JSON.stringify(trending), 300); } catch {}
      return res.status(200).json({ trending });
    } catch {
      return res.status(200).json({ trending: [
        { query:'GlideRecord query', count:42 },
        { query:'Slack spoke setup', count:38 },
        { query:'REST API authentication', count:31 },
        { query:'ACL denied error', count:27 },
        { query:'Business Rule example', count:24 },
      ]});
    }
  }

  // ── Autocomplete suggestions ──────────────────────────────────────────────
  if (body.suggest === '1' || body.suggest === true) {
    const q = (body.q || '').trim().slice(0, 100);
    if (q.length < 2) return res.status(200).json({ suggestions: [] });

    try {
      const [spokesR, apisR] = await Promise.all([
        query(
          `SELECT name, slug, icon, 'spoke' as type, category
           FROM sn_spokes
           WHERE name ILIKE $1 OR description ILIKE $1
           ORDER BY view_count DESC NULLS LAST LIMIT 4`,
          [`%${q}%`]
        ),
        query(
          `SELECT name, slug, 'api' as type, api_type as category
           FROM sn_api_reference
           WHERE name ILIKE $1
           ORDER BY name LIMIT 3`,
          [`%${q}%`]
        ),
      ]);

      const suggestions = [
        ...spokesR.rows.map(r => ({ name: r.name, slug: r.slug, icon: r.icon || '🔌', type: 'spoke', category: r.category })),
        ...apisR.rows.map(r => ({ name: r.name, slug: r.slug, icon: '📡', type: 'api', category: r.category })),
      ];
      return res.status(200).json({ suggestions });
    } catch {
      return res.status(200).json({ suggestions: [] });
    }
  }

  // ── Full search ───────────────────────────────────────────────────────────
  const q       = (body.query || body.q || '').trim().slice(0, 300);
  const userId  = body.user_id  || null;
  const context = body.context  || body.ctx || '';
  const session = body.session_id || null;

  if (!q) return res.status(400).json({ error: 'Query required' });

  const intent   = detectIntent(q);
  const cacheKey = `s2:${q.toLowerCase().replace(/\s+/g,'_').slice(0,80)}:${context}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json({ ...JSON.parse(cached), cached: true });
  } catch {}

  const t0 = Date.now();

  const { spokes, apis, properties } = await searchAll(q, {
    limit: 8, includeAPIs: true, includeProps: true,
  });

  let dbAnswer     = null;
  let aiAnswer     = null;
  let aiModel      = null;
  let answerSource = null;

  const topSpoke = spokes[0];
  const topAPI   = apis[0];

  if (topSpoke?.score >= HIGH_CONFIDENCE || (!topAPI && topSpoke)) {
    try {
      const row = await query(`SELECT * FROM sn_spokes WHERE slug = $1`, [topSpoke.slug]);
      if (row.rows[0]) {
        dbAnswer     = answerFromSpoke(row.rows[0], q);
        answerSource = 'spoke_db';
        // Increment view count
        query(`UPDATE sn_spokes SET view_count = COALESCE(view_count,0)+1 WHERE slug = $1`, [topSpoke.slug]).catch(() => {});
      }
    } catch {}
  } else if (topAPI) {
    try {
      const row = await query(`SELECT * FROM sn_api_reference WHERE slug = $1`, [topAPI.slug]);
      if (row.rows[0]) {
        dbAnswer     = topAPI.api_type === 'context'
          ? answerFromContext(row.rows[0], q)
          : answerFromAPI(row.rows[0], q);
        answerSource = 'api_db';
      }
    } catch {}
  }

  const hasResult = spokes.length > 0 || apis.length > 0;

  // AI only when DB has no answer
  if (!dbAnswer && !hasResult) {
    const aiResult = await askAI(q, {
      systemPrompt: buildAIPrompt(intent, context),
      maxTokens: 600, timeout: 15000,
    });
    if (aiResult?.success) {
      aiAnswer     = aiResult.answer;
      aiModel      = aiResult.model;
      answerSource = 'ai_fallback';
    }
    // Track gaps (queries we couldn't answer from DB)
    query(
      `INSERT INTO sn_search_gaps (query, count, last_seen)
       VALUES ($1, 1, NOW())
       ON CONFLICT (query) DO UPDATE SET count = sn_search_gaps.count + 1, last_seen = NOW()`,
      [q.toLowerCase().trim()]
    ).catch(() => {});
  }

  const latency = Date.now() - t0;

  // Track analytics
  query(
    `INSERT INTO sn_search_analytics (query, results, user_id, created_at, has_result, answer_source, latency_ms)
     VALUES ($1,$2,$3,NOW(),$4,$5,$6)`,
    [q, spokes.length, userId, hasResult || !!aiAnswer, answerSource, latency]
  ).catch(() => {});

  // Track user activity
  if (session) {
    query(
      `INSERT INTO sn_user_activity (session_id, user_id, event_type, query, metadata, created_at)
       VALUES ($1,$2,'search',$3,$4,NOW())`,
      [session, userId, q, JSON.stringify({ intent, context, results: spokes.length })]
    ).catch(() => {});
  }

  const response = {
    success:       true,
    results:       spokes,
    api_results:   apis,
    properties,
    db_answer:     dbAnswer,
    ai_answer:     aiAnswer,
    ai_model:      aiModel,
    answer_source: answerSource,
    intent,
    latency_ms:    latency,
    cached:        false,
  };

  const ttl = dbAnswer ? 7200 : aiAnswer ? 600 : 300;
  try { await cacheSet(cacheKey, JSON.stringify(response), ttl); } catch {}

  return res.status(200).json(response);
}

function buildAIPrompt(intent, context) {
  const base = {
    error:   'ServiceNow error debugger. Root cause in 1 sentence, then exact fix with code, then why it happens.',
    compare: 'ServiceNow architect. Give a clear WHEN to use each option. Be opinionated.',
    code:    'ServiceNow developer. Write production-ready code with comments. No placeholder logic.',
    explain: 'ServiceNow expert. HOW + WHEN + WHY + the gotcha nobody documents.',
  }[intent] || 'ServiceNow expert. Be direct and practical.';

  const ctx = {
    'jira-admin':       ' User is a Jira admin. Translate SN terms to Jira equivalents.',
    'python-dev':       ' User is a Python dev. Show REST API examples.',
    'salesforce-admin': ' User is Salesforce admin. Map SN concepts to Salesforce.',
    'beginner':         ' User is new to ServiceNow. Define all terms.',
  }[context] || '';

  return base + ctx + ' Use markdown. Keep it under 400 words.';
}
