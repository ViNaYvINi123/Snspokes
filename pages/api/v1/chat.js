import { askAI } from '../../../lib/ai';
import { getAICachedResponse, setAICachedResponse } from '../../../lib/aiCache';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } });
  const { message, history = [], system_prompt } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'message field required' } });

  const cached = await getAICachedResponse(message.trim(), 'v1chat');
  if (cached?.answer && !cached.answer.includes('No response')) {
    return res.status(200).json({ data: { answer: cached.answer, model: cached.model, cached: true }, meta: { request_id: req.apiContext?.requestId } });
  }

  const result = await askAI(message.trim(), {
    systemPrompt: system_prompt || undefined,
    history: history.map(h => ({ role: h.role, content: h.content })),
    maxTokens: 1500,
  });

  if (result.success) setAICachedResponse(message.trim(), result.answer, result.model, 'v1chat').catch(() => {});

  return res.status(200).json({
    data: { answer: result.answer, model: result.model, cached: false },
    meta: { request_id: req.apiContext?.requestId, success: result.success },
  });
}
export default handler;
