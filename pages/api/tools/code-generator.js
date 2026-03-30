import { n8nGenerateCode } from '../../../lib/n8n';
import { query } from '../../../lib/db';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { checkSearchLimit } from '../../../lib/plans';
import { CODE_TYPES, buildSystemPrompt } from '../../../lib/codeGenerator';
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
    if (!code_type || !CODE_TYPES[code_type]) return apiError(res, 'Invalid code_type. Valid: ' + Object.keys(CODE_TYPES).join(', '), 400);

    const identifier = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';
    const planCheck = await checkSearchLimit(user_id || null, identifier);
    if (!planCheck.allowed) {
      return res.status(403).json({ success: false, error: planCheck.message, upgrade_url: '/pricing', limit_reached: true });
    }

    const cacheKey = 'codegen:' + crypto.createHash('md5').update(code_type + ':' + prompt.trim()).digest('hex');
    const cached = await cacheGet(cacheKey);
    if (cached) {
      try { return res.status(200).json({ success: true, ...JSON.parse(cached), cached: true }); } catch {}
    }

    // All AI goes through n8n workflows
    try {
      const n8nResult = await n8nGenerateCode(prompt.trim(), code_type, config);
      if (n8nResult.success && n8nResult.data?.code) {
        const response = { code: n8nResult.data.code, code_type, model: n8nResult.data.model || 'n8n', prompt: prompt.trim() };
        await cacheSet(cacheKey, JSON.stringify(response), 3600);
        query('INSERT INTO sn_dev_activity (user_id,action,metadata) VALUES ($1,$2,$3)',
          [user_id || null, 'code_generated', JSON.stringify({ code_type, via: 'n8n' })]).catch(() => {});
        return res.status(200).json({ success: true, ...response, via: 'n8n' });
      }

      return res.status(200).json({ success: false, error: 'AI code generation unavailable. Check n8n code-generator workflow is active.' });
    } catch (err) {
      return apiError(res, 'Code generation failed. Make sure n8n is running.', 500);
    }
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withTrace(handler);
