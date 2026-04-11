/**
 * snspokes Search API
 *
 * Architecture:
 *   1. Redis cache check (1h TTL) — most queries hit this
 *   2. Postgres full-text + fuzzy search — always works, zero external deps
 *   3. AI answer — Gemini → Groq → Ollama (optional enhancement, graceful skip)
 *
 * If AI is down: search still returns DB results. Core feature never breaks.
 */

import { searchAll }        from '../../lib/search';
import { askAI }            from '../../lib/ai';
import { query }            from '../../lib/db';
import { cacheGet, cacheSet } from '../../lib/redis';
import { setSecurityHeaders } from '../../lib/security';

const INTENT_PROMPTS = {
  error: `You are a ServiceNow debugger. The user hit an error.
Format your answer EXACTLY like this:

## Root Cause
[one plain-English sentence]

## Fix
\`\`\`js
[working code]
\`\`\`

## Why this happens
[one sentence]

## Watch out for
- [gotcha 1]
- [gotcha 2]

No preamble. No "I hope this helps." Just the fix.`,

  compare: `You are a ServiceNow architect. User wants to know WHEN to use what.
Format:

## Use [A] when
- [specific scenario]

## Use [B] when
- [specific scenario]

## Rule of thumb
[one clear sentence]

Be opinionated. Give a recommendation. Docs never do this — you do.`,

  code: `You are a ServiceNow developer. Write production-ready, copy-paste code.
Format:

## Code
\`\`\`js
[full working code with inline comments on non-obvious parts]
\`\`\`

## What this does
[2 bullets max]

No placeholder comments. No "// add your logic here".`,

  default: `You are a ServiceNow expert. Answer like a senior developer explaining to a peer.
Docs tell you HOW. You tell them HOW + WHEN + WHY + the gotcha they'll hit.

Format:
## Answer
[plain English, max 2 paragraphs]

## Example
\`\`\`js
[working code]
\`\`\`

## The gotcha
[the thing that trips everyone up that the docs never mention]

Keep it tight.`,
};

const CONTEXT_ADDONS = {
  'jira-admin':       '\n\nUser is a Jira admin, not a ServiceNow developer. Translate SN terms to Jira equivalents.',
  'python-dev':       '\n\nUser is a Python developer. Show curl or Python requests examples alongside SN code.',
  'salesforce-admin': '\n\nUser is a Salesforce admin. Map SN concepts to SF equivalents (Table=Object, etc.).',
  'beginner':         '\n\nUser is new to ServiceNow. Define technical terms. No unexplained acronyms.',
  'slack-admin':      '\n\nUser manages Slack. Explain from the Slack side first, then ServiceNow side.',
};

function detectIntent(q) {
  const ql = q.toLowerCase();
  if (/error|exception|failed|cannot|undefined|null|4\d\d|5\d\d|invalid|restricted|denied|not found/.test(ql)) return 'error';
  if (/vs|versus|difference|better|choose|compare|when to use|which one/.test(ql)) return 'compare';
  if (/code|script|example|write|create|build|generate|business rule|script include/.test(ql)) return 'code';
  return 'default';
}

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const body    = req.method === 'POST' ? req.body : req.query;
  const q       = (body.query || body.q || '').trim().slice(0, 300);
  const userId  = body.user_id || null;
  const context = body.context || '';

  if (!q) return res.status(400).json({ error: 'Query required' });

  const intent     = detectIntent(q);
  const cacheKey   = `search:v2:${q.toLowerCase().replace(/\s+/g,'_').slice(0,80)}:${context}:${intent}`;

  // 1. Check Redis cache
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json({ ...JSON.parse(cached), cached: true });
  } catch {}

  // 2. Postgres search — ALWAYS runs, never depends on AI
  const t0 = Date.now();
  const { spokes, apis, properties } = await searchAll(q, { limit: 8, includeAPIs: true });

  // 3. AI answer — optional, graceful fallback to null
  let aiAnswer = null;
  let aiModel  = null;

  const systemPrompt = (INTENT_PROMPTS[intent] || INTENT_PROMPTS.default)
    + (CONTEXT_ADDONS[context] || '');

  const aiResult = await askAI(q, {
    systemPrompt,
    maxTokens: 700,
    timeout:   18000,
  });

  if (aiResult?.success && aiResult.answer) {
    aiAnswer = aiResult.answer;
    aiModel  = aiResult.model;
  }

  // 4. Track search
  query(
    `INSERT INTO sn_search_analytics (query, results, user_id, created_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING`,
    [q, spokes.length, userId]
  ).catch(() => {});

  // 5. Save to user memory
  if (userId) {
    query(
      `INSERT INTO sn_saved_queries (user_id, name, query, created_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING`,
      [userId, q.slice(0, 60), q]
    ).catch(() => {});
  }

  const response = {
    success:     true,
    results:     spokes,
    api_results: apis,
    properties,
    ai_answer:   aiAnswer,
    ai_model:    aiModel,
    intent,
    latency_ms:  Date.now() - t0,
    cached:      false,
  };

  // 6. Cache result (1h for AI answers, 10min without)
  try {
    await cacheSet(cacheKey, JSON.stringify(response), aiAnswer ? 3600 : 600);
  } catch {}

  return res.status(200).json(response);
}
