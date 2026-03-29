import { lintScript } from '../../../lib/scriptLinter';
import { callAI } from '../../../lib/llm';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';
import { withTrace } from '../../../lib/requestTrace';
import crypto from 'crypto';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { script, script_type, ai_review = false, user_id } = req.body;
    if (!script?.trim()) return apiError(res, 'Script required', 400);
    if (script.length > 50000) return apiError(res, 'Script too large (max 50KB)', 400);

    // Static lint (instant, no AI)
    const lintResult = lintScript(script, { type: script_type });

    let aiReview = null;
    if (ai_review && script.length > 50) {
      const cacheKey = `lint_ai:${crypto.createHash('md5').update(script).digest('hex')}`;
      const cached = await cacheGet(cacheKey);
      if (cached) {
        aiReview = cached;
      } else {
        try {
          const result = await callAI({
            messages: [
              {
                role: 'system',
                content: `You are a ServiceNow code reviewer. Review the script and return ONLY JSON:
{
  "summary": "2-3 sentence overall assessment",
  "critical_issues": ["issue 1", "issue 2"],
  "suggestions": ["improvement 1", "improvement 2"],
  "optimized_snippet": "if you can suggest a small optimization, show it here, else null",
  "overall_rating": 7
}`,
              },
              { role: 'user', content: `Review this ServiceNow ${script_type || 'server'} script:\n\n${script.substring(0, 3000)}` },
            ],
          });

          try {
            const clean = result.content.replace(/```json|```/g, '').trim();
            aiReview = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
          } catch {
            aiReview = { summary: result.content, critical_issues: [], suggestions: [] };
          }

          await cacheSet(cacheKey, aiReview, 3600);
        } catch {}
      }
    }

    // Save result
    query(
      'INSERT INTO sn_lint_results (user_id, script, script_type, issues, score, ai_review) VALUES ($1,$2,$3,$4,$5,$6)',
      [user_id || null, script.substring(0, 5000), script_type || 'server', JSON.stringify(lintResult.issues), lintResult.score, aiReview?.summary || null]
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      ...lintResult,
      ai_review: aiReview,
      lines: script.split('\n').length,
      chars: script.length,
    });
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withTrace(handler);
