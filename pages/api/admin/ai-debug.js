import { withAdminAuth } from '../../../lib/adminAuth';
import { n8nAiDebug } from '../../../lib/n8n';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return apiError(res, 'Method not allowed', 405);
  const { question, context_type = 'general' } = req.body;
  if (!question?.trim()) return apiError(res, 'Question required', 400);

  // Gather context from DB
  let contextData = '';
  try {
    if (context_type === 'errors') {
      const r = await query('SELECT message, source, created_at FROM sn_error_logs WHERE resolved=false ORDER BY created_at DESC LIMIT 10').catch(() => ({ rows: [] }));
      contextData = 'Recent errors:\n' + r.rows.map(e => '- [' + e.source + '] ' + e.message).join('\n');
    } else if (context_type === 'performance') {
      const r = await query("SELECT path,method,AVG(duration_ms)::int as avg_ms,COUNT(*) as calls FROM sn_api_logs WHERE created_at>NOW()-INTERVAL '1 hour' GROUP BY path,method ORDER BY avg_ms DESC LIMIT 10").catch(() => ({ rows: [] }));
      contextData = 'Slow APIs:\n' + r.rows.map(row => '- ' + row.method + ' ' + row.path + ': ' + row.avg_ms + 'ms (' + row.calls + ' calls)').join('\n');
    } else if (context_type === 'db') {
      const r = await query("SELECT tablename, pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) as size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(quote_ident(tablename)) DESC LIMIT 10").catch(() => ({ rows: [] }));
      contextData = 'DB tables:\n' + r.rows.map(t => '- ' + t.tablename + ': ' + t.size).join('\n');
    }
  } catch {}

  // All AI goes through n8n
  try {
    const n8nResult = await n8nAiDebug(question, context_type, contextData);
    if (n8nResult.success && n8nResult.data?.answer) {
      query('INSERT INTO sn_audit_logs (actor,action,resource,resource_id,new_value) VALUES ($1,$2,$3,$4,$5)',
        ['admin', 'ai_debug', 'system', null, JSON.stringify({ question: question.substring(0, 100), context_type })]).catch(() => {});
      return res.status(200).json({ success: true, answer: n8nResult.data.answer, model: n8nResult.data.model, context_used: context_type, via: 'n8n' });
    }

    return res.status(200).json({ success: false, error: 'AI debug unavailable. Check n8n ai-debug workflow is active.' });
  } catch (err) {
    return apiError(res, 'AI debug failed. Make sure n8n is running.', 500);
  }
}

export default withAdminAuth(handler);
