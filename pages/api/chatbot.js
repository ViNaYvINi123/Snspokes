import { checkRateLimit } from '../../lib/redis';
import { query } from '../../lib/db';
import { getAICachedResponse, setAICachedResponse } from '../../lib/aiCache';
import { setSecurityHeaders } from '../../lib/security';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'llama3.2';

async function askOllama(question, history = []) {
  const messages = [
    {
      role: 'system',
      content: `You are snspokes AI — a ServiceNow Integration Hub expert assistant.
You help ServiceNow developers with:
- Integration Hub spokes (Slack, Jira, GitHub, AWS, etc.)
- GlideRecord queries and Script Includes
- Flow Designer and subflows
- Business Rules, Client Scripts, UI Actions
- Debugging errors and ACL issues
- Best practices for scoped applications

Be concise, practical, and always include working code examples when relevant.
Format code in markdown code blocks with the language specified.`,
    },
    ...history.map(m => ({ role: m.role, content: m.content || m.text || '' })),
    { role: 'user', content: question },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Ollama error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const answer = data?.message?.content || data?.response || null;
    if (!answer) throw new Error('Empty response from Ollama');

    return { success: true, answer, model: OLLAMA_MODEL };
  } catch (err) {
    clearTimeout(timeout);
    const isOffline = err.name === 'AbortError' ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('fetch failed') ||
      err.message?.includes('ENOTFOUND');

    return {
      success: false,
      offline: isOffline,
      error: err.message,
    };
  }
}

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { question, history, user_id, session_id } = req.body || {};
  if (!question?.trim()) return res.status(400).json({ success: false, answer: 'Question required' });

  const ip  = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'anon';
  const ua  = req.headers['user-agent'] || '';
  const id  = user_id || ip;
  const sid = session_id || ('s_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));

  const rl = await checkRateLimit('chat:' + id, 30, 60);
  if (!rl.allowed) return res.status(429).json({ success: false, answer: 'Rate limit. Wait ' + rl.resetIn + 's.', session_id: sid });

  const startTime = Date.now();

  // Track session
  try {
    const existing = await query('SELECT id FROM sn_chatbot_sessions WHERE session_id=$1', [sid]);
    if (existing.rows.length === 0) {
      await query(
        'INSERT INTO sn_chatbot_sessions (session_id, user_id, user_ip, user_agent, status, message_count, last_question, started_at, last_active) VALUES ($1,$2,$3,$4,$5,1,$6,NOW(),NOW())',
        [sid, user_id || null, ip, ua.substring(0, 500), 'active', question.trim().substring(0, 500)]
      );
    } else {
      await query(
        'UPDATE sn_chatbot_sessions SET message_count=message_count+1, last_question=$1, last_active=NOW(), status=$2 WHERE session_id=$3',
        [question.trim().substring(0, 500), 'active', sid]
      );
    }
    query('INSERT INTO sn_chatbot_messages (session_id, role, content, created_at) VALUES ($1,$2,$3,NOW())',
      [sid, 'user', question.trim().substring(0, 2000)]).catch(() => {});
  } catch {}

  // Check cache
  const cached = await getAICachedResponse(question.trim(), 'chat');
  if (cached?.answer && !cached.answer.includes('No response') && !cached.answer.includes('unavailable') && !cached.answer.includes('not available')) {
    const latency = Date.now() - startTime;
    query('INSERT INTO sn_chatbot_messages (session_id, role, content, model, latency_ms, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
      [sid, 'assistant', cached.answer.substring(0, 5000), cached.model + ' (cached)', latency]).catch(() => {});
    return res.status(200).json({ success: true, answer: cached.answer, model: cached.model, latency_ms: latency, via: 'cache', session_id: sid, cached: true });
  }

  // Call Ollama
  const historyMsgs = Array.isArray(history) ? history.slice(-6) : [];
  const result = await askOllama(question.trim(), historyMsgs);

  const latency = Date.now() - startTime;

  let answer, model;

  if (result.success) {
    answer = result.answer;
    model  = result.model;
    // Cache it
    setAICachedResponse(question.trim(), answer, model, 'chat').catch(() => {});
  } else if (result.offline) {
    answer = `⚙️ **AI assistant is offline**\n\nOllama isn't running yet. Once installed and started on the server, the chatbot will be fully powered by **${OLLAMA_MODEL}**.\n\nIn the meantime, try the **[Search](/search)** page for AI-powered answers about ServiceNow spokes.`;
    model  = 'offline';
  } else {
    answer = `Something went wrong with the AI. Please try again in a moment.`;
    model  = 'error';
  }

  // Log response
  query('INSERT INTO sn_chatbot_messages (session_id, role, content, model, latency_ms, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
    [sid, 'assistant', answer.substring(0, 5000), model, latency]).catch(() => {});
  query('UPDATE sn_chatbot_sessions SET last_answer=$1, last_active=NOW() WHERE session_id=$2',
    [answer.substring(0, 500), sid]).catch(() => {});

  return res.status(200).json({
    success: result.success,
    answer,
    model,
    latency_ms: latency,
    via: result.success ? 'ollama' : (result.offline ? 'offline' : 'error'),
    session_id: sid,
  });
}
