import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial batch
  async function fetchActivity() {
    try {
      const [users, searches, payments, errors, codeGens, submissions] = await Promise.all([
        query("SELECT 'signup' as type, name as label, email as sublabel, plan as meta, created_at FROM sn_users ORDER BY created_at DESC LIMIT 3").catch(() => ({ rows: [] })),
        query("SELECT 'search' as type, query as label, user_ip as sublabel, results::text as meta, created_at FROM sn_search_analytics ORDER BY created_at DESC LIMIT 3").catch(() => ({ rows: [] })),
        query("SELECT 'payment' as type, plan as label, amount::text as meta, created_at FROM sn_subscriptions WHERE status='active' ORDER BY created_at DESC LIMIT 2").catch(() => ({ rows: [] })),
        query("SELECT 'error' as type, message as label, source as sublabel, 'unresolved' as meta, created_at FROM sn_error_logs WHERE resolved=false ORDER BY created_at DESC LIMIT 2").catch(() => ({ rows: [] })),
        query("SELECT 'codegen' as type, code_type as label, model as sublabel, created_at FROM sn_code_generations ORDER BY created_at DESC LIMIT 2").catch(() => ({ rows: [] })),
        query("SELECT 'submission' as type, name as label, status as meta, created_at FROM sn_spoke_submissions ORDER BY created_at DESC LIMIT 2").catch(() => ({ rows: [] })),
      ]);

      const all = [
        ...users.rows, ...searches.rows, ...payments.rows,
        ...errors.rows, ...codeGens.rows, ...submissions.rows,
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 15);

      sendEvent({ type: 'batch', events: all });
    } catch (err) {
      sendEvent({ type: 'error', message: err.message });
    }
  }

  await fetchActivity();

  // Poll every 5 seconds
  const interval = setInterval(fetchActivity, 5000);

  // Heartbeat every 15 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
    res.end();
  });
}

export default withAdminAuth(handler);

export const config = { api: { bodyParser: false } };
