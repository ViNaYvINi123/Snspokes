import { withAPIGateway } from '../../../lib/apiGateway';
import { query } from '../../../lib/db';
import { askAI } from '../../../lib/ai';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });
  const { error_message, context } = req.body || {};
  if (!error_message?.trim()) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'error_message required' } });

  // Check encyclopedia first
  const dbResult = await query("SELECT * FROM sn_error_encyclopedia WHERE error_pattern ILIKE $1 LIMIT 1", [`%${error_message.trim().substring(0, 100)}%`]).catch(() => ({ rows: [] }));
  if (dbResult.rows.length > 0) {
    return res.status(200).json({ data: { ...dbResult.rows[0], source: 'encyclopedia' }, meta: { request_id: req.apiContext?.requestId } });
  }

  // AI analysis
  const ai = await askAI('Analyze this ServiceNow error: ' + error_message + (context ? ' Context: ' + context : ''), {
    systemPrompt: 'You are a ServiceNow error expert. Provide: root_cause, fix_steps, prevention. Use markdown.', maxTokens: 1000
  });

  return res.status(200).json({ data: { analysis: ai.answer, model: ai.model, source: 'ai' }, meta: { request_id: req.apiContext?.requestId, success: ai.success } });
}
export default withAPIGateway(handler);
