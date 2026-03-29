import { n8nChatbot } from '../../lib/n8n';
import { callAI } from '../../lib/llm';
import { checkRateLimit } from '../../lib/redis';
import { query } from '../../lib/db';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { question, history, user_id } = req.body || {};
  if (!question?.trim()) return res.status(400).json({ success: false, answer: 'Question required' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';
  const id = user_id || ip;
  const rl = await checkRateLimit(`chat:${id}`, 20, 60);
  if (!rl.allowed) return res.status(429).json({ success: false, answer: `⏳ Rate limit reached. Wait ${rl.resetIn}s.` });

  const startTime = Date.now();

  // ── Step 1: n8n → OpenRouter ──────────────────────────────
  const n8nResult = await n8nChatbot(question.trim(), Array.isArray(history) ? history.slice(-6) : []);
  if (n8nResult.success && n8nResult.data?.answer) {
    query('INSERT INTO sn_search_analytics (query,user_id,results,user_ip,created_at) VALUES ($1,$2,$3,$4,NOW())',
      [`[chatbot] ${question.trim().substring(0, 200)}`, user_id || null, 1, ip]).catch(() => {});
    return res.status(200).json({
      success: true,
      answer: n8nResult.data.answer,
      model: n8nResult.data.model,
      latency_ms: Date.now() - startTime,
      via: 'n8n',
    });
  }

  // ── Step 2: Fallback → direct OpenRouter/Ollama ───────────
  try {
    const result = await callAI({
      messages: [
        { role: 'system', content: 'You are an expert ServiceNow Integration Hub assistant. Only answer ServiceNow questions. Be concise and practical.' },
        ...(Array.isArray(history) ? history.slice(-6) : []),
        { role: 'user', content: question.trim() },
      ],
    });
    return res.status(200).json({
      success: true,
      answer: result.content,
      model: result.model,
      latency_ms: Date.now() - startTime,
      via: 'direct',
    });
  } catch {
    return res.status(500).json({ success: false, answer: '⚠️ AI temporarily unavailable. Please try again.' });
  }
}
