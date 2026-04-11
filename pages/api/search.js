/**
 * snspokes Search API
 * 
 * What makes this different from servicenow.com/docs:
 * - Understands WHO is asking (context: jira-admin, python-dev, beginner, etc.)
 * - Answers in plain English first, technical detail second
 * - Error-first: recognizes error messages and jumps straight to root cause + fix
 * - Translates from other platform language to ServiceNow (Jira→SN, Salesforce→SN)
 * - Tells you WHEN and WHY to use something, not just HOW
 */

import { askAI } from '../../lib/ai';
import { query } from '../../lib/db';
import { cacheGet, cacheSet } from '../../lib/redis';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const body   = req.method === 'POST' ? req.body : req.query;
  const q      = (body.query || body.q || '').trim().slice(0, 500);
  const userId = body.user_id || null;
  const context = body.context || ''; // 'jira-admin', 'python-dev', 'beginner', 'error', etc.

  if (!q) return res.status(400).json({ error: 'Query required' });

  const cacheKey = `search:${q.toLowerCase().replace(/\s+/g,'_').slice(0,80)}:${context}`;

  // Check cache
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      return res.status(200).json({ ...data, cached: true });
    }
  } catch {}

  // Search DB for matching spokes
  let spokeResults = [];
  let apiResults = [];
  try {
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 2).slice(0, 6);
    if (words.length > 0) {
      const pattern = words.map((_, i) => `$${i + 1}`).join(' | ');
      const params = words.map(w => `%${w}%`);

      const [spokes, apis] = await Promise.all([
        query(`
          SELECT slug, name, description, icon, category, tags, tier, view_count,
                 ai_description, setup_steps, actions, common_errors
          FROM sn_spokes
          WHERE is_active = true AND (
            ${words.map((_, i) => `(LOWER(name) LIKE $${i+1} OR LOWER(description) LIKE $${i+1} OR LOWER(category) LIKE $${i+1})`).join(' OR ')}
          )
          ORDER BY view_count DESC LIMIT 6
        `, params),
        query(`
          SELECT slug, name, category, api_type, scope, global_var, description, gotcha
          FROM sn_api_reference
          WHERE ${words.map((_, i) => `(LOWER(name) LIKE $${i+1} OR LOWER(description) LIKE $${i+1})`).join(' OR ')}
          LIMIT 4
        `, params).catch(() => ({ rows: [] })),
      ]);
      spokeResults = spokes.rows;
      apiResults   = apis.rows;
    }
  } catch {}

  // Detect query intent to choose the right AI mode
  const qLower = q.toLowerCase();
  const isError   = /error|exception|failed|cannot|undefined|null|403|401|404|500|invalid|restricted|denied/.test(qLower);
  const isHowTo   = /how (do|to|can)|what is|explain|difference between|when (to|should)|which (api|method)/.test(qLower);
  const isCode    = /code|script|example|write|create|build|generate|business rule|script include|client script/.test(qLower);
  const isCompare = /vs|versus|difference|better|choose|compare|when to use/.test(qLower);

  // Build context-aware system prompt — this is the core differentiation
  let systemPrompt = '';

  if (isError) {
    systemPrompt = `You are a ServiceNow expert specializing in debugging. A developer has encountered an error.

YOUR JOB:
1. Identify the root cause in ONE plain-English sentence
2. Give the exact fix (code if needed)
3. Explain WHY this happens (so they avoid it next time)
4. List any related gotchas

Format:
## Root Cause
[one sentence]

## Fix
\`\`\`js
[working code]
\`\`\`

## Why This Happens
[brief explanation]

## Watch Out For
[bullet list of related pitfalls]

Be direct. No preamble. No "I hope this helps."`;

  } else if (isCompare) {
    systemPrompt = `You are a ServiceNow architect explaining when to use different approaches.

YOUR JOB: Give a clear "use X when..." decision guide. Not just how they work — WHEN and WHY.

Format:
## Use [A] when...
- [specific scenario]
- [specific scenario]

## Use [B] when...
- [specific scenario]

## Decision rule
[one sentence rule of thumb]

## Example
[brief real-world scenario]

Be opinionated. Give a clear recommendation. This is what ServiceNow docs never do.`;

  } else if (isCode) {
    systemPrompt = `You are a ServiceNow developer writing production-ready code.

YOUR JOB:
1. Give working, copy-paste-ready code
2. Add inline comments explaining the non-obvious parts
3. Include error handling
4. Note any gotchas or caveats

Format:
## Code
\`\`\`js
[full working code with comments]
\`\`\`

## Key Points
[2-3 bullet points about what this does and why]

## Common Variations
[1-2 alternative patterns if relevant]

Write code a senior developer would not be embarrassed by. No placeholder comments like "// add your logic here".`;

  } else {
    systemPrompt = `You are a ServiceNow expert. Your answers are what servicenow.com/docs SHOULD be but never is.

The difference: docs tell you HOW. You tell them HOW + WHEN + WHY + WHAT TO WATCH OUT FOR.

YOUR JOB:
1. Answer in plain English first (one paragraph max)
2. Show a practical, real-world code example
3. Call out the non-obvious gotcha that trips everyone up
4. If relevant: mention the scoped vs global difference

Format:
## Answer
[plain English explanation]

## Example
\`\`\`js
[working code]
\`\`\`

## The gotcha nobody tells you
[the thing that's not in the official docs]

Keep it tight. Senior developers hate fluff.`;
  }

  // Context modifier — if user told us who they are
  const contextAddons = {
    'jira-admin':    '\n\nIMPORTANT: The user is a Jira admin, not a ServiceNow expert. Translate ServiceNow terms to Jira equivalents where helpful. Explain what "spoke", "flow", "table", etc. mean in Jira language.',
    'python-dev':    '\n\nIMPORTANT: The user is a Python developer calling ServiceNow REST APIs. Show curl or Python requests examples alongside any ServiceNow-side code. Focus on the REST/JSON interface.',
    'salesforce-admin': '\n\nIMPORTANT: The user is a Salesforce admin. Map ServiceNow concepts to Salesforce equivalents (Table→Object, Business Rule→Trigger, Script Include→Apex Class, etc.).',
    'beginner':      '\n\nIMPORTANT: The user is new to ServiceNow. Define technical terms on first use. Explain what table names mean. Avoid acronyms without explanation.',
    'slack-admin':   '\n\nIMPORTANT: The user manages Slack and wants to integrate with ServiceNow. Explain from the Slack side first, then the ServiceNow side.',
  };
  if (context && contextAddons[context]) systemPrompt += contextAddons[context];

  // Run AI with the right prompt
  let aiAnswer = '';
  let aiModel  = '';
  try {
    const result = await askAI(q, {
      systemPrompt,
      maxTokens: 900,
      timeout: 25000,
    });
    if (result.success) {
      aiAnswer = result.answer;
      aiModel  = result.model;
    }
  } catch {}

  // Track search
  try {
    await query(
      `INSERT INTO sn_search_analytics (query, results, user_id, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT DO NOTHING`,
      [q, spokeResults.length + apiResults.length, userId]
    ).catch(() => {});
  } catch {}

  const response = {
    success: true,
    results:    spokeResults,
    api_results: apiResults,
    ai_answer:  aiAnswer,
    ai_model:   aiModel,
    intent:     isError ? 'error' : isCompare ? 'compare' : isCode ? 'code' : 'explain',
    cached:     false,
  };

  // Cache for 1 hour
  try {
    await cacheSet(cacheKey, JSON.stringify(response), 3600);
  } catch {}

  return res.status(200).json(response);
}
