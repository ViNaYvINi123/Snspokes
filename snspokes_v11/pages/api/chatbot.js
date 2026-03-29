import { checkRateLimit } from '../../lib/redis';
import { callAI, isServiceNowQuery } from '../../lib/llm';
import { query } from '../../lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, history, user_id } = req.body;
  if (!question?.trim()) return res.status(400).json({ success: false, answer: 'Question required' });

  // Rate limit
  const id = user_id || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';
  const rl = await checkRateLimit(`chat:${id}`, 20, 60);
  if (!rl.allowed) {
    return res.status(429).json({ success: false, answer: `⏳ Rate limit reached. Wait ${rl.resetIn}s.` });
  }

  const messages = [
    {
      role: 'system',
      content: `You are an expert ServiceNow Integration Hub assistant for snspokes.
You ONLY answer ServiceNow-related questions. For other topics, politely redirect.
Be concise, practical, and developer-friendly. Include code snippets when helpful.`,
    },
    ...(Array.isArray(history) ? history.slice(-6) : []),
    { role: 'user', content: question.trim() },
  ];

  const startTime = Date.now();

  try {
    const result = await callAI({ messages });

    // Store chat interaction in DB (non-blocking)
    query(
      `INSERT INTO sn_search_analytics (query, user_id, results, user_ip, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [`[chatbot] ${question.trim().substring(0, 200)}`, user_id || null, 1, id]
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      answer: result.content,
      model: result.model,
      cached: result.cached,
      latency_ms: Date.now() - startTime,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      answer: '⚠️ AI assistant temporarily unavailable. Please try again in a moment.',
    });
  }
}
