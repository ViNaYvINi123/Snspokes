import { query } from '../../../lib/db';
import { buildScript, analyzeScript, SN_OPERATORS } from '../../../lib/glideQueryBuilder';
import { callN8n } from '../../../lib/n8n';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { apiError } from '../../../lib/validate';
import { withTrace } from '../../../lib/requestTrace';
import crypto from 'crypto';
import { checkRateLimit } from '../../../lib/redis';
import { getClientIp } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { action, table, user_id } = req.query;
    if (action === 'tables') {
      try {
        const r = await query('SELECT table_name,label,description,category FROM sn_table_reference ORDER BY category,label');
        return res.status(200).json({ success: true, tables: r.rows });
      } catch {
        return res.status(200).json({ success: true, tables: [
          {table_name:'incident',label:'Incident',category:'ITSM'},{table_name:'change_request',label:'Change Request',category:'ITSM'},
          {table_name:'problem',label:'Problem',category:'ITSM'},{table_name:'sc_request',label:'Service Request',category:'Catalog'},
          {table_name:'sys_user',label:'User',category:'Platform'},{table_name:'cmdb_ci',label:'Configuration Item',category:'CMDB'},
        ]});
      }
    }
    if (action === 'table_fields' && table) {
      try {
        const r = await query('SELECT fields,state_values FROM sn_table_reference WHERE table_name=$1', [table]);
        if (r.rows.length) return res.status(200).json({ success: true, fields: r.rows[0].fields||[], state_values: r.rows[0].state_values||{} });
      } catch {}
      return res.status(200).json({ success: true, fields: [], state_values: {} });
    }
    if (action === 'popular') {
      try {
        const r = await query('SELECT id,name,table_name,script,encoded_query,use_count FROM sn_saved_queries WHERE is_public=true ORDER BY use_count DESC LIMIT 10');
        return res.status(200).json({ success: true, queries: r.rows });
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
      query('INSERT INTO sn_dev_activity (user_id,action,metadata) VALUES ($1,$2,$3)',
        [user_id||null,'query_built',JSON.stringify({table:tableName,conditions:conditions?.length||0})]).catch(()=>{});
      return res.status(200).json({ success: true, script: result.script, encoded_query: result.encoded_query, warnings: result.warnings, analysis });
    }

    if (action === 'ai_optimize') {
      if (!inputScript) return apiError(res, 'script required', 400);
      const cacheKey = `qopt:${crypto.createHash('md5').update(inputScript).digest('hex')}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return res.status(200).json({ success: true, ...cached, cached: true });
      try {
        // n8n → OpenRouter
        const result = await callN8n('sn-optimize-query', { script: inputScript, table_name: tableName });
        await cacheSet(cacheKey, result, 3600);
        return res.status(200).json({ success: true, ...result, source: 'n8n+openrouter' });
      } catch (err) { return apiError(res, 'AI optimization failed', 500); }
    }

    if (action === 'save') {
      if (!name?.trim() || !tableName) return apiError(res, 'name and tableName required', 400);
      const built = buildScript({ tableName, conditions, orderBy, orderDir, limit });
      try {
        const r = await query(
          `INSERT INTO sn_saved_queries (user_id,name,table_name,conditions,order_by,order_dir,limit_rows,script,encoded_query,is_public)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [user_id||null,name.trim(),tableName,JSON.stringify(conditions||[]),orderBy||null,orderDir||'ASC',parseInt(limit)||10,built.script,built.encoded_query,false]
        );
        return res.status(201).json({ success: true, id: r.rows[0].id });
      } catch (err) { return apiError(res, 'Save failed', 500); }
    }
    return apiError(res, 'Unknown action', 400);
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withTrace(handler);
