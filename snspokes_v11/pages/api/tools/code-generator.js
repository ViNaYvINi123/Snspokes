import { callAI } from '../../../lib/llm';
import { query } from '../../../lib/db';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { checkSearchLimit } from '../../../lib/plans';
import { CODE_TYPES, buildSystemPrompt } from '../../../lib/codeGenerator';
import { apiError } from '../../../lib/validate';
import { withTrace } from '../../../lib/requestTrace';
import crypto from 'crypto';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, code_types: CODE_TYPES });
  }

  if (req.method === 'POST') {
    const { prompt, code_type, config = {}, user_id } = req.body;

    if (!prompt?.trim()) return apiError(res, 'Prompt required', 400);
    if (!code_type || !CODE_TYPES[code_type]) return apiError(res, 'Invalid code type', 400);

    const identifier = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';
    const planCheck = await checkSearchLimit(user_id || null, identifier);
    if (!planCheck.allowed) {
      return res.status(403).json({ success: false, error: planCheck.message, upgrade_url: '/pricing', limit_reached: true });
    }

    // Cache key
    const cacheKey = `codegen:${crypto.createHash('md5').update(`${code_type}:${prompt}`).digest('hex')}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json({ success: true, ...cached, cached: true });

    const systemPrompt = buildSystemPrompt(code_type, config);

    try {
      const result = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate a ServiceNow ${CODE_TYPES[code_type].label} that does the following:\n\n${prompt.trim()}\n\nTable: ${config.tableName || 'incident'}\n${config.when ? `When: ${config.when}` : ''}\n\nReturn ONLY the JavaScript code with comments. Production-ready.`
          },
        ],
      });

      const response = {
        code: result.content,
        code_type,
        model: result.model,
        prompt: prompt.trim(),
      };

      await cacheSet(cacheKey, response, 3600);

      // Save to history
      query(
        'INSERT INTO sn_code_generations (user_id, code_type, prompt, generated, model) VALUES ($1,$2,$3,$4,$5)',
        [user_id || null, code_type, prompt.trim().substring(0, 500), result.content, result.model]
      ).catch(() => {});

      query('INSERT INTO sn_dev_activity (user_id, action, metadata) VALUES ($1,$2,$3)',
        [user_id || null, 'code_generated', JSON.stringify({ code_type, prompt: prompt.substring(0, 100) })]
      ).catch(() => {});

      return res.status(200).json({ success: true, ...response });
    } catch (err) {
      return apiError(res, 'Code generation failed: ' + err.message, 500);
    }
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withTrace(handler);
