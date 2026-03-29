import { withAdminAuth } from '../../../lib/adminAuth';
import { callAI } from '../../../lib/llm';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';

async function handler(req, res) {
  if (req.method !== 'POST') return apiError(res, 'Method not allowed', 405);

  const { question, context_type = 'general' } = req.body;
  if (!question?.trim()) return apiError(res, 'Question required', 400);

  // Gather context based on type
  let contextData = '';

  try {
    if (context_type === 'errors') {
      const errors = await query(
        'SELECT message, source, created_at FROM sn_error_logs WHERE resolved=false ORDER BY created_at DESC LIMIT 10'
      ).catch(() => ({ rows: [] }));
      contextData = `Recent unresolved errors:\n${errors.rows.map(e => `- [${e.source}] ${e.message}`).join('\n')}`;
    } else if (context_type === 'performance') {
      const slow = await query(
        `SELECT path, method, AVG(duration_ms)::int as avg_ms, COUNT(*) as calls
         FROM sn_api_logs WHERE created_at > NOW() - INTERVAL '1 hour'
         GROUP BY path, method ORDER BY avg_ms DESC LIMIT 10`
      ).catch(() => ({ rows: [] }));
      contextData = `Slow APIs (last 1h):\n${slow.rows.map(r => `- ${r.method} ${r.path}: ${r.avg_ms}ms avg (${r.calls} calls)`).join('\n')}`;
    } else if (context_type === 'db') {
      const tables = await query(
        `SELECT tablename, pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) as size
         FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(quote_ident(tablename)) DESC LIMIT 10`
      ).catch(() => ({ rows: [] }));
      contextData = `Database tables:\n${tables.rows.map(t => `- ${t.tablename}: ${t.size}`).join('\n')}`;
    }
  } catch {}

  const systemPrompt = `You are an expert full-stack developer and DevOps engineer debugging a ServiceNow SaaS platform called snspokes.
Tech stack: Next.js, PostgreSQL, Redis, n8n, Ollama/OpenRouter AI.
You help debug issues, suggest fixes, write SQL queries, and explain errors.
Be concise and give actionable advice.`;

  const userMessage = contextData
    ? `Context:\n${contextData}\n\nQuestion: ${question}`
    : question;

  try {
    const result = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    // Log this debug session
    query(
      'INSERT INTO sn_audit_logs (actor,action,resource,resource_id,new_value) VALUES ($1,$2,$3,$4,$5)',
      ['admin', 'ai_debug', 'system', null, JSON.stringify({ question: question.substring(0, 100), context_type })]
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      answer: result.content,
      model: result.model,
      context_used: context_type,
    });
  } catch (err) {
    return apiError(res, 'AI debug failed: ' + err.message, 500);
  }
}

export default withAdminAuth(handler);
