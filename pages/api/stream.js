import { checkRateLimit, isServiceNowQuery } from '../../lib/redis';
import { streamOllama, isServiceNowQuery as checkSN } from '../../lib/llm';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, user_id } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'Query required' });

  // Rate limit
  const id = user_id || req.headers['x-forwarded-for'] || 'anon';
  const rl = await checkRateLimit(`stream:${id}`, 10, 60);
  if (!rl.allowed) return res.status(429).json({ error: `Rate limit exceeded. Try in ${rl.resetIn}s.` });

  // Validate ServiceNow
  if (!checkSN(query)) {
    return res.status(400).json({ error: 'Only ServiceNow queries supported.', is_off_topic: true });
  }

  // SSE headers - critical for nginx to not buffer
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
    'Access-Control-Allow-Origin': '*',
    'Transfer-Encoding': 'chunked',
  });

  const send = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      // Force flush
      if (res.flush) res.flush();
    } catch {}
  };

  send({ type: 'start', query });

  const messages = [
    {
      role: 'system',
      content: 'You are a ServiceNow expert. Give a concise, practical answer. Include code if helpful.',
    },
    { role: 'user', content: query.trim() },
  ];

  try {
    await streamOllama(
      messages,
      (chunk) => send({ type: 'chunk', content: chunk }),
      (model) => send({ type: 'done', model }),
    );
  } catch (err) {
    send({ type: 'error', message: 'AI streaming unavailable. Use regular search instead.' });
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
