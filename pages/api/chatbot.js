import { n8nChatbot } from '../../lib/n8n';
import { askAI } from '../../lib/ai';
import { checkRateLimit } from '../../lib/redis';
import { query } from '../../lib/db';
import { getAICachedResponse, setAICachedResponse } from '../../lib/aiCache';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { question, history, user_id, session_id } = req.body || {};
  if (!question?.trim()) return res.status(400).json({ success: false, answer: 'Question required' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'anon';
  const ua = req.headers['user-agent'] || '';
  const id = user_id || ip;
  const sid = session_id || ('s_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));

  const rl = await checkRateLimit('chat:' + id, 30, 60);
  if (!rl.allowed) return res.status(429).json({ success: false, answer: 'Rate limit. Wait ' + rl.resetIn + 's.', session_id: sid });

  const startTime = Date.now();

  // Track session
  try {
    const existing = await query('SELECT id FROM sn_chatbot_sessions WHERE session_id=$1', [sid]);
    if (existing.rows.length === 0) {
      await query('INSERT INTO sn_chatbot_sessions (session_id, user_id, user_ip, user_agent, status, message_count, last_question, started_at, last_active) VALUES ($1,$2,$3,$4,$5,1,$6,NOW(),NOW())',
        [sid, user_id || null, ip, ua.substring(0, 500), 'active', question.trim().substring(0, 500)]);
    } else {
      await query('UPDATE sn_chatbot_sessions SET message_count=message_count+1, last_question=$1, last_active=NOW(), status=$2 WHERE session_id=$3',
        [question.trim().substring(0, 500), 'active', sid]);
    }
    query('INSERT INTO sn_chatbot_messages (session_id, role, content, created_at) VALUES ($1,$2,$3,NOW())', [sid, 'user', question.trim().substring(0, 2000)]).catch(() => {});
  } catch {}

  // 1. Check cache
  const cached = await getAICachedResponse(question.trim(), 'chat');
  if (cached && cached.answer && !cached.answer.includes('No response') && !cached.answer.includes('unavailable')) {
    const latency = Date.now() - startTime;
    query('INSERT INTO sn_chatbot_messages (session_id, role, content, model, latency_ms, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
      [sid, 'assistant', cached.answer.substring(0, 5000), cached.model + ' (cached)', latency]).catch(() => {});
    return res.status(200).json({ success: true, answer: cached.answer, model: cached.model, latency_ms: latency, via: 'cache', session_id: sid, cached: true });
  }

  let answer = null;
  let model = null;
  const historyMsgs = Array.isArray(history) ? history.slice(-6) : [];

  // 2. Try n8n first
  try {
    const n8nResult = await n8nChatbot(question.trim(), historyMsgs);
    if (n8nResult.success && n8nResult.data?.answer && n8nResult.data.answer !== 'No response from AI') {
      answer = n8nResult.data.answer;
      model = n8nResult.data.model || 'n8n';
    }
  } catch {}

  // 3. Fallback: Direct OpenRouter
  if (!answer) {
    const aiResult = await askAI(question.trim(), {
      history: historyMsgs.map(m => ({ role: m.role, content: m.content || m.text || '' })),
    });
    answer = aiResult.answer;
    model = aiResult.success ? (aiResult.model || 'direct') : 'error';
  }

  const latency = Date.now() - startTime;

  // Cache successful responses
  if (answer && model !== 'error') {
    setAICachedResponse(question.trim(), answer, model, 'chat').catch(() => {});
  }

  // Log AI response
  query('INSERT INTO sn_chatbot_messages (session_id, role, content, model, latency_ms, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
    [sid, 'assistant', (answer || '').substring(0, 5000), model, latency]).catch(() => {});
  query('UPDATE sn_chatbot_sessions SET last_answer=$1, last_active=NOW() WHERE session_id=$2',
    [(answer || '').substring(0, 500), sid]).catch(() => {});

  return res.status(200).json({ success: true, answer: answer || 'No response. Please try again.', model, latency_ms: latency, via: model === 'error' ? 'error' : 'ai', session_id: sid });
}
