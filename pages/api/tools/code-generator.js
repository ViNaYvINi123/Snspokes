import { query } from '../../../lib/db';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { checkSearchLimit } from '../../../lib/plans';
import { CODE_TYPES, buildSystemPrompt } from '../../../lib/codeGenerator';
import { askAI } from '../../../lib/ai';
import { apiError } from '../../../lib/validate';
import { withTrace } from '../../../lib/requestTrace';
import crypto from 'crypto';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, code_types: CODE_TYPES });
  }

  if (req.method === 'POST') {
    const { prompt, code_type, config = {}, user_id } = req.body || {};
    if (!prompt?.trim()) return apiError(res, 'Prompt required', 400);
    if (!code_type || !CODE_TYPES[code_type]) return apiError(res, 'Invalid code_type', 400);

    const identifier = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';
    const planCheck = await checkSearchLimit(user_id || null, identifier);
    if (!planCheck.allowed) return res.status(403).json({ success: false, error: planCheck.message, upgrade_url: '/pricing', limit_reached: true });

    // Cache check
    const cacheKey = 'codegen:' + crypto.createHash('md5').update(code_type + ':' + prompt.trim()).digest('hex');
    const cached = await cacheGet(cacheKey);
    if (cached) { try { return res.status(200).json({ success: true, ...JSON.parse(cached), cached: true }); } catch {} }

    // Direct AI call with specialized prompt
    const systemPrompt = buildSystemPrompt(code_type);
    const aiResult = await askAI(
      `Generate a ServiceNow ${CODE_TYPES[code_type]?.label || code_type} for: ${prompt.trim()}`,
      { systemPrompt, maxTokens: 2000, timeout: 60000 }
    );

    if (aiResult.success) {
      const response = { code: aiResult.answer, code_type, model: aiResult.model, prompt: prompt.trim() };
      await cacheSet(cacheKey, JSON.stringify(response), 3600);
      query('INSERT INTO sn_dev_activity (user_id,action,metadata) VALUES ($1,$2,$3)',
        [user_id || null, 'code_generated', JSON.stringify({ code_type, model: aiResult.model })]).catch(() => {});
      return res.status(200).json({ success: true, ...response });
    }

    return res.status(200).json({ success: false, error: aiResult.answer || 'Code generation failed' });
  }

  return apiError(res, 'Method not allowed', 405);
}
export default withTrace(handler);
