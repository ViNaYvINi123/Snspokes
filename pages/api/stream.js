import { checkRateLimit } from '../../lib/redis';
import { n8nChatbot } from '../../lib/n8n';
import { askAI } from '../../lib/ai';
import { getAICachedResponse, setAICachedResponse } from '../../lib/aiCache';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query: q, user_id } = req.body;
  if (!q?.trim()) return res.status(400).json({ error: 'Query required' });

  const id = user_id || req.headers['x-forwarded-for'] || 'anon';
  const rl = await checkRateLimit('stream:' + id, 15, 60);
  if (!rl.allowed) return res.status(429).json({ error: 'Rate limit. Try in ' + rl.resetIn + 's.' });

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  const send = (data) => { try { res.write('data: ' + JSON.stringify(data) + '\n\n'); if (res.flush) res.flush(); } catch {} };
  send({ type: 'start', query: q });

  // 1. Check cache
  const cached = await getAICachedResponse(q.trim(), 'stream');
  if (cached && cached.answer && !cached.answer.includes('No response')) {
    const words = cached.answer.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      send({ type: 'chunk', content: words.slice(i, i + 3).join(' ') + ' ' });
    }
    send({ type: 'done', model: (cached.model || '') + ' (cached)' });
    res.end();
    return;
  }

  let answer = null;
  let model = null;

  // 2. Try n8n first
  try {
    const n8nResult = await n8nChatbot(q.trim(), []);
    if (n8nResult.success && n8nResult.data?.answer && n8nResult.data.answer !== 'No response from AI') {
      answer = n8nResult.data.answer;
      model = n8nResult.data.model || 'n8n';
    }
  } catch {}

  // 3. Fallback: Direct OpenRouter (no n8n needed)
  if (!answer) {
    const aiResult = await askAI(q.trim());
    if (aiResult.success) {
      answer = aiResult.answer;
      model = aiResult.model + ' (direct)';
    } else {
      answer = aiResult.answer; // Error message
      model = 'error';
    }
  }

  // Stream the response
  if (answer) {
    const words = answer.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      send({ type: 'chunk', content: words.slice(i, i + 3).join(' ') + ' ' });
    }
    // Cache successful responses only
    if (model !== 'error') {
      setAICachedResponse(q.trim(), answer, model, 'stream').catch(() => {});
    }
  }

  send({ type: 'done', model: model || 'unknown' });
  res.end();
}

export const config = { api: { bodyParser: true, responseLimit: false, externalResolver: true } };
