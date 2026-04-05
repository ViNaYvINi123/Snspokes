import { checkRateLimit } from '../../lib/redis';
import { getAICachedResponse, setAICachedResponse } from '../../lib/aiCache';
import { n8nChatbot } from '../../lib/n8n';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query: q, user_id } = req.body;
  if (!q?.trim()) return res.status(400).json({ error: 'Query required' });

  // Rate limit
  const id = user_id || req.headers['x-forwarded-for'] || 'anon';
  const rl = await checkRateLimit('stream:' + id, 10, 60);
  if (!rl.allowed) return res.status(429).json({ error: 'Rate limit exceeded. Try in ' + rl.resetIn + 's.' });

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
    'Transfer-Encoding': 'chunked',
  });

  const send = (data) => {
    try {
      res.write('data: ' + JSON.stringify(data) + '\n\n');
      if (res.flush) res.flush();
    } catch {}
  };

  send({ type: 'start', query: q });

  // Check cache first
  const cached = await getAICachedResponse(q.trim(), 'stream');
  if (cached) {
    const words = cached.answer.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      send({ type: 'chunk', content: words.slice(i, i + 3).join(' ') + ' ' });
    }
    send({ type: 'done', model: (cached.model || 'cached') + ' (cached)' });
    res.end();
    return;
  }

  try {
    // Route through n8n chatbot workflow
    const n8nResult = await n8nChatbot(q.trim(), []);

    if (n8nResult.success && n8nResult.data?.answer) {
      const answer = n8nResult.data.answer;
      // Simulate streaming by chunking the response
      const words = answer.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join(' ') + ' ';
        send({ type: 'chunk', content: chunk });
      }
      setAICachedResponse(q.trim(), answer, n8nResult.data.model || 'n8n', 'stream').catch(() => {});
      send({ type: 'done', model: n8nResult.data.model || 'n8n' });
    } else {
      send({ type: 'error', message: 'n8n AI workflow returned no answer. Check workflows are active.' });
    }
  } catch (err) {
    send({ type: 'error', message: 'n8n AI unavailable. Make sure n8n is running.' });
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
    externalResolver: true,
  },
};
