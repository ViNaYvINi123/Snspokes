import { withAPIGateway } from '../../../lib/apiGateway';
import { lintScript } from '../../../lib/scriptLinter';
import { askAI } from '../../../lib/ai';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  const { script, script_type = 'server', ai_review = false } = req.body || {};
  if (!script?.trim()) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'script required' } });
  if (script.length > 50000) return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Max 50KB' } });

  const result = lintScript(script, { type: script_type });

  if (ai_review) {
    try {
      const ai = await askAI('Review this script:\n```\n' + script.substring(0, 3000) + '\n```', { systemPrompt: 'You are a ServiceNow code reviewer. Provide specific feedback. Use markdown.', maxTokens: 800 });
      if (ai.success) result.ai_review = ai.answer;
    } catch {}
  }

  return res.status(200).json({ data: { ...result, lines: script.split('\n').length }, meta: { request_id: req.apiContext?.requestId } });
}
export default withAPIGateway(handler);
