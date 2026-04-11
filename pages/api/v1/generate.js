import { askAI } from '../../../lib/ai';
import { CODE_TYPES, buildSystemPrompt } from '../../../lib/codeGenerator';
import { cacheGet, cacheSet } from '../../../lib/redis';
import crypto from 'crypto';

async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ data: { code_types: Object.keys(CODE_TYPES).map(k => ({ id: k, ...CODE_TYPES[k] })) } });
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED' } });

  const { prompt, code_type, table, trigger } = req.body || {};
  if (!prompt?.trim()) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'prompt required' } });
  if (!code_type || !CODE_TYPES[code_type]) return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Invalid code_type. Valid: ' + Object.keys(CODE_TYPES).join(', ') } });

  const cacheKey = 'v1gen:' + crypto.createHash('md5').update(code_type + prompt.trim()).digest('hex');
  const cached = await cacheGet(cacheKey);
  if (cached) { try { return res.status(200).json({ data: { ...JSON.parse(cached), cached: true }, meta: { request_id: req.apiContext?.requestId } }); } catch {} }

  const systemPrompt = buildSystemPrompt(code_type, { tableName: table, when: trigger });
  const result = await askAI(`Generate ServiceNow ${CODE_TYPES[code_type].label}: ${prompt.trim()}`, { systemPrompt, maxTokens: 2000 });

  if (result.success) {
    const data = { code: result.answer, code_type, model: result.model, prompt: prompt.trim() };
    await cacheSet(cacheKey, JSON.stringify(data), 3600);
    return res.status(200).json({ data, meta: { request_id: req.apiContext?.requestId } });
  }

  return res.status(502).json({ error: { code: 'AI_UNAVAILABLE', message: result.answer } });
}
export default handler;
