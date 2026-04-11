import { checkRateLimit } from '../../lib/redis';
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

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  const send = (data) => {
    try { res.write('data: ' + JSON.stringify(data) + '\n\n'); if (res.flush) res.flush(); } catch {}
  };
  send({ type: 'start', query: q });

  // Check cache first
  const cached = await getAICachedResponse(q.trim(), 'stream');
  if (cached?.answer && !cached.answer.includes('No response')) {
    const words = cached.answer.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      send({ type: 'chunk', content: words.slice(i, i + 3).join(' ') + ' ' });
      await new Promise(r => setTimeout(r, 20));
    }
    send({ type: 'done', model: (cached.model || '') + ' (cached)' });
    res.end();
    return;
  }

  // Call AI directly
  const aiResult = await askAI(q.trim(), {
    systemPrompt: `You are snspokes AI — a ServiceNow Integration Hub expert.
Answer questions about ServiceNow spokes, GlideRecord, Flow Designer, and best practices.
Be concise and include working code examples. Use markdown formatting.`,
    maxTokens: 1500,
  });

  const answer = aiResult.success ? aiResult.answer : aiResult.answer;
  const model  = aiResult.success ? aiResult.model : 'error';

  if (answer) {
    const words = answer.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      send({ type: 'chunk', content: words.slice(i, i + 3).join(' ') + ' ' });
      await new Promise(r => setTimeout(r, 20));
    }
    if (aiResult.success) {
      setAICachedResponse(q.trim(), answer, model, 'stream').catch(() => {});
    }
  }

  send({ type: 'done', model: model || 'unknown' });
  res.end();
}

export const config = { api: { bodyParser: true, responseLimit: false, externalResolver: true } };
