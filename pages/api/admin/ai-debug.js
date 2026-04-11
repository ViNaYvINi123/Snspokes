import { withAdminAuth } from '../../../lib/adminAuth';
import { askAI } from '../../../lib/ai';
import { apiError } from '../../../lib/validate';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, context_type = 'general' } = req.body || {};
  if (!prompt?.trim()) return apiError(res, 'prompt required', 400);

  const systemPrompts = {
    general:    'You are a ServiceNow expert AI assistant. Answer directly with code examples where relevant.',
    debug:      'You are a ServiceNow debugging expert. Analyze errors, find root causes, provide fixes.',
    codegen:    'You are a ServiceNow developer. Generate clean, production-ready code with comments.',
    docs:       'You are a ServiceNow documentation expert. Explain concepts clearly with examples.',
  };

  try {
    const result = await askAI(prompt.trim(), {
      systemPrompt: systemPrompts[context_type] || systemPrompts.general,
      maxTokens: 2000,
    });

    return res.status(200).json({
      success: result.success,
      answer: result.answer,
      model: result.model,
      context_used: context_type,
      via: 'direct',
    });
  } catch (err) {
    return apiError(res, 'AI debug failed: ' + err.message, 500);
  }
}

export default withAdminAuth(handler);
