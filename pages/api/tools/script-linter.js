import { n8nLintScript } from '../../../lib/n8n';
import { lintScript } from '../../../lib/scriptLinter';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';
import { withTrace } from '../../../lib/requestTrace';
import { checkRateLimit } from '../../../lib/redis';
import { getClientIp, setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
  // Rate limit: 30 requests/min per IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit('tool:script-linter:' + ip, 30, 60);
  if (!rl.allowed) return res.status(429).json({ success: false, error: 'Too many requests. Try again in a minute.' });

  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { script, script_type = 'server', ai_review = false, user_id } = req.body || {};

  if (!script?.trim()) return res.status(400).json({ success: false, error: 'Script required' });
  if (script.length > 50000) return res.status(400).json({ success: false, error: 'Script too large (max 50KB)' });

  const lines = script.split('\n').length;

  // ── Step 1: Try n8n (handles both static + AI review) ────
  const n8nResult = await n8nLintScript(script, script_type, ai_review);
  if (n8nResult.success && n8nResult.data?.grade) {
    query('INSERT INTO sn_lint_results (user_id,script,script_type,issues,score) VALUES ($1,$2,$3,$4,$5)',
      [user_id || null, script.substring(0, 5000), script_type, JSON.stringify(n8nResult.data.issues || []), n8nResult.data.score || 0]).catch(() => {});
    return res.status(200).json({ success: true, ...n8nResult.data, via: 'n8n', lines });
  }

  // ── Step 2: Fallback → local static lint ─────────────────
  const lintResult = lintScript(script, { type: script_type });
  query('INSERT INTO sn_lint_results (user_id,script,script_type,issues,score) VALUES ($1,$2,$3,$4,$5)',
    [user_id || null, script.substring(0, 5000), script_type, JSON.stringify(lintResult.issues || []), lintResult.score || 0]).catch(() => {});

  return res.status(200).json({ success: true, ...lintResult, ai_review: null, via: 'local', lines });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Linter error: ' + err.message });
  }
}

export default withTrace(handler);
