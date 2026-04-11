/**
 * snspokes Search API — DB-first, no AI required
 *
 * Flow:
 *  1. Search Postgres (full-text + fuzzy)
 *  2. If top result is high-confidence → build answer from DB data
 *  3. If no good match → try AI (Gemini/Groq/Ollama) as fallback
 *
 * 90% of queries are answered from the DB instantly.
 * AI only fires when the DB genuinely has no answer.
 */

import { searchAll }           from '../../lib/search';
import { answerFromSpoke, answerFromAPI, answerFromContext } from '../../lib/answer';
import { askAI }               from '../../lib/ai';
import { query }               from '../../lib/db';
import { cacheGet, cacheSet }  from '../../lib/redis';
import { setSecurityHeaders }  from '../../lib/security';

// Confidence threshold: if top result ranks above this → use DB answer, skip AI
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

  const body    = req.method === 'POST' ? req.body : req.query;
  const q       = (body.query || body.q || '').trim().slice(0, 300);
  const userId  = body.user_id || null;
  const context = body.context || '';

  if (!q) return res.status(400).json({ error: 'Query required' });

  const intent   = detectIntent(q);
  const cacheKey = `s:${q.toLowerCase().replace(/\s+/g,'_').slice(0,80)}:${context}`;

  // ── 1. Cache check ────────────────────────────────────────────────────────
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json({ ...JSON.parse(cached), cached: true });
  } catch {}

  const t0 = Date.now();

  // ── 2. Postgres search ────────────────────────────────────────────────────
  const { spokes, apis, properties } = await searchAll(q, {
    limit: 8, includeAPIs: true, includeProps: true,
  });

  let dbAnswer  = null;
  let aiAnswer  = null;
  let aiModel   = null;
  let answerSource = null;

  // ── 3. Build answer from DB if good match found ───────────────────────────
  const topSpoke = spokes[0];
  const topAPI   = apis[0];

  if (topSpoke?.score >= HIGH_CONFIDENCE || (!topAPI && topSpoke)) {
    // Fetch full spoke row with all fields
    try {
      const row = await query(
        `SELECT * FROM sn_spokes WHERE slug = $1`, [topSpoke.slug]
      );
      if (row.rows[0]) {
        dbAnswer     = answerFromSpoke(row.rows[0], q);
        answerSource = 'spoke_db';
      }
    } catch {}

  } else if (topAPI) {
    // Fetch full API row
    try {
      const row = await query(
        `SELECT * FROM sn_api_reference WHERE slug = $1`, [topAPI.slug]
      );
      if (row.rows[0]) {
        dbAnswer     = topAPI.api_type === 'context'
          ? answerFromContext(row.rows[0], q)
          : answerFromAPI(row.rows[0], q);
        answerSource = 'api_db';
      }
    } catch {}
  }

  // ── 4. AI only when DB has no answer ─────────────────────────────────────
  if (!dbAnswer && spokes.length === 0 && apis.length === 0) {
    const aiResult = await askAI(q, {
      systemPrompt: buildAIPrompt(intent, context),
      maxTokens:    600,
      timeout:      15000,
    });
    if (aiResult?.success) {
      aiAnswer     = aiResult.answer;
      aiModel      = aiResult.model;
      answerSource = 'ai_fallback';
    }
  }

  // ── 5. Track ──────────────────────────────────────────────────────────────
  query(
    `INSERT INTO sn_search_analytics (query, results, user_id, created_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING`,
    [q, spokes.length, userId]
  ).catch(() => {});

  // ── 6. Respond ────────────────────────────────────────────────────────────
  const response = {
    success:       true,
    results:       spokes,
    api_results:   apis,
    properties,
    db_answer:     dbAnswer,     // structured data from our synced DB
    ai_answer:     aiAnswer,     // only when DB has nothing
    ai_model:      aiModel,
    answer_source: answerSource, // 'spoke_db' | 'api_db' | 'ai_fallback' | null
    intent,
    latency_ms:    Date.now() - t0,
    cached:        false,
  };

  // Cache 2h if DB answered, 10min if AI answered, 5min if nothing
  const ttl = dbAnswer ? 7200 : aiAnswer ? 600 : 300;
  try { await cacheSet(cacheKey, JSON.stringify(response), ttl); } catch {}

  return res.status(200).json(response);
}

function buildAIPrompt(intent, context) {
  const base = {
    error:   'ServiceNow error debugger. Root cause in 1 sentence, then exact fix with code, then why it happens.',
    compare: 'ServiceNow architect. Give a clear WHEN to use each option. Be opinionated. Docs never do this.',
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
