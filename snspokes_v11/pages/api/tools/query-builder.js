import { withTrace } from '../../../lib/requestTrace';
import { query } from '../../../lib/db';
import { buildScript, analyzeScript, SN_OPERATORS } from '../../../lib/glideQueryBuilder';
import { callAI } from '../../../lib/llm';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { apiError } from '../../../lib/validate';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { action, table, user_id } = req.query;
    if (action === 'tables') {
      try {
        const result = await query('SELECT table_name, label, description, category FROM sn_table_reference ORDER BY category, label');
        return res.status(200).json({ success: true, tables: result.rows });
      } catch {
        return res.status(200).json({ success: true, tables: [
          { table_name: 'incident', label: 'Incident', category: 'ITSM' },
          { table_name: 'change_request', label: 'Change Request', category: 'ITSM' },
          { table_name: 'problem', label: 'Problem', category: 'ITSM' },
          { table_name: 'sc_request', label: 'Service Request', category: 'Catalog' },
          { table_name: 'sys_user', label: 'User', category: 'Platform' },
          { table_name: 'cmdb_ci', label: 'Configuration Item', category: 'CMDB' },
          { table_name: 'task', label: 'Task', category: 'Platform' },
          { table_name: 'sc_task', label: 'Catalog Task', category: 'Catalog' },
        ]});
      }
    }
    if (action === 'table_fields' && table) {
      try {
        const result = await query('SELECT fields, state_values FROM sn_table_reference WHERE table_name=$1', [table]);
        if (result.rows.length > 0) return res.status(200).json({ success: true, fields: result.rows[0].fields || [], state_values: result.rows[0].state_values || {} });
      } catch {}
      return res.status(200).json({ success: true, fields: [], state_values: {} });
    }
    if (action === 'popular') {
      try {
        const result = await query('SELECT id,name,table_name,script,encoded_query,use_count FROM sn_saved_queries WHERE is_public=true ORDER BY use_count DESC LIMIT 10');
        return res.status(200).json({ success: true, queries: result.rows });
      } catch { return res.status(200).json({ success: true, queries: [] }); }
    }
    return res.status(200).json({ success: true, operators: SN_OPERATORS });
  }

  if (req.method === 'POST') {
    const { action, tableName, conditions, orderBy, orderDir, limit, user_id, name, useAggregate, script: inputScript } = req.body;

    if (action === 'build' || !action) {
      const result = buildScript({ tableName, conditions, orderBy, orderDir, limit, useAggregate });
      if (result.error) return apiError(res, result.error, 400);
      const analysis = analyzeScript(result.script);
      query('INSERT INTO sn_dev_activity (user_id, action, metadata) VALUES ($1,$2,$3)',
        [user_id || null, 'query_built', JSON.stringify({ table: tableName, conditions: conditions?.length || 0 })]
      ).catch(() => {});
      return res.status(200).json({ success: true, script: result.script, encoded_query: result.encoded_query, warnings: result.warnings, analysis });
    }

    if (action === 'ai_optimize') {
      if (!inputScript) return apiError(res, 'script required', 400);
      const cacheKey = `qopt:${Buffer.from(inputScript).toString('base64').substring(0, 40)}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return res.status(200).json({ success: true, ...cached, cached: true });
      try {
        const result = await callAI({
          messages: [
            { role: 'system', content: 'You are a ServiceNow GlideRecord performance expert. Analyze and optimize. Return ONLY JSON: {"issues":[{"severity":"warning|error|info","message":"..."}],"optimized_script":"...","explanation":"...","tips":["..."]}' },
            { role: 'user', content: `Optimize this script for table '${tableName}':\n\n${inputScript}` },
          ],
        });
        let data;
        try { const c = result.content.replace(/```json|```/g,'').trim(); data = JSON.parse(c.match(/\{[\s\S]*\}/)?.[0] || c); }
        catch { data = { explanation: result.content, issues: [], tips: [], optimized_script: inputScript }; }
        await cacheSet(cacheKey, data, 3600);
        return res.status(200).json({ success: true, ...data, model: result.model });
      } catch (err) { return apiError(res, 'AI failed: ' + err.message, 500); }
    }

    if (action === 'save') {
      if (!name?.trim() || !tableName) return apiError(res, 'name and tableName required', 400);
      const built = buildScript({ tableName, conditions, orderBy, orderDir, limit });
      try {
        const result = await query(
          `INSERT INTO sn_saved_queries (user_id,name,table_name,conditions,order_by,order_dir,limit_rows,script,encoded_query,is_public)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [user_id||null, name.trim(), tableName, JSON.stringify(conditions||[]), orderBy||null, orderDir||'ASC', parseInt(limit)||10, built.script, built.encoded_query, false]
        );
        return res.status(201).json({ success: true, id: result.rows[0].id });
      } catch (err) { return apiError(res, 'Save failed: ' + err.message, 500); }
    }
    return apiError(res, 'Unknown action', 400);
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withTrace(handler);
