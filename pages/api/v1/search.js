import { query } from '../../../lib/db';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { setSecurityHeaders } from '../../../lib/security';

// Built-in snippets + cheatsheet data for instant search
const SNIPPETS = [
  { type: 'snippet', title: 'GlideRecord Query', desc: 'Query records with conditions', code: "var gr = new GlideRecord('incident');\ngr.addQuery('active', true);\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.number);\n}", tags: 'gliderecord query filter basic' },
  { type: 'snippet', title: 'Insert Record', desc: 'Create a new record', code: "var gr = new GlideRecord('incident');\ngr.initialize();\ngr.short_description = 'New incident';\ngr.insert();", tags: 'insert create new record' },
  { type: 'snippet', title: 'Update Records', desc: 'Batch update records', code: "var gr = new GlideRecord('incident');\ngr.addQuery('state', 1);\ngr.query();\nwhile (gr.next()) {\n  gr.priority = 4;\n  gr.update();\n}", tags: 'update batch modify' },
  { type: 'snippet', title: 'Delete Record', desc: 'Delete with safety check', code: "var gr = new GlideRecord('u_temp_table');\ngr.addQuery('active', false);\ngr.query();\nwhile (gr.next()) gr.deleteRecord();", tags: 'delete remove' },
  { type: 'snippet', title: 'GlideAggregate COUNT', desc: 'Count records efficiently', code: "var ga = new GlideAggregate('incident');\nga.addQuery('active', true);\nga.addAggregate('COUNT');\nga.query();\nif (ga.next()) gs.info('Total: ' + ga.getAggregate('COUNT'));", tags: 'aggregate count sum performance' },
  { type: 'snippet', title: 'Encoded Query', desc: 'Use encoded query string', code: "var gr = new GlideRecord('incident');\ngr.addEncodedQuery('active=true^priority=1^stateIN1,2');\ngr.query();", tags: 'encoded query url filter' },
  { type: 'snippet', title: 'Reference Field Display', desc: 'Get display value vs sys_id', code: "var gr = new GlideRecord('incident');\ngr.get('sys_id_here');\nvar name = gr.assigned_to.getDisplayValue();\nvar email = gr.assigned_to.email;", tags: 'reference display dot-walk' },
  { type: 'snippet', title: 'Before Business Rule', desc: 'Auto-fill fields on insert', code: "(function executeRule(current, previous) {\n  if (!current.assignment_group.nil()) {\n    var grp = current.assignment_group.getRefRecord();\n    current.assigned_to = grp.manager;\n  }\n})(current, previous);", tags: 'business rule before insert auto' },
  { type: 'snippet', title: 'Client Script onChange', desc: 'Show/hide field on change', code: "function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading) return;\n  g_form.setVisible('u_hardware_type', newValue == 'hardware');\n  g_form.setMandatory('u_hardware_type', newValue == 'hardware');\n}", tags: 'client script onchange visibility mandatory' },
  { type: 'snippet', title: 'REST API Outbound', desc: 'Make REST call from SN', code: "var rm = new sn_ws.RESTMessageV2('My REST', 'POST');\nrm.setRequestHeader('Content-Type', 'application/json');\nrm.setRequestBody(JSON.stringify({ title: 'Test' }));\nvar response = rm.execute();\ngs.info(response.getStatusCode());", tags: 'rest api outbound http request' },
  { type: 'snippet', title: 'Scripted REST Endpoint', desc: 'Custom inbound REST API', code: "(function process(request, response) {\n  var id = request.pathParams.id;\n  var gr = new GlideRecord('incident');\n  if (gr.get(id)) {\n    response.setBody({ number: gr.number.toString(), state: gr.state.getDisplayValue() });\n  } else {\n    response.setStatus(404);\n    response.setBody({ error: 'Not found' });\n  }\n})(request, response);", tags: 'scripted rest inbound api endpoint' },
  { type: 'snippet', title: 'Flow Designer Action', desc: 'Custom flow action script', code: "(function execute(inputs, outputs) {\n  var gr = new GlideRecord('sc_task');\n  gr.initialize();\n  gr.short_description = inputs.description;\n  gr.assignment_group = inputs.group_sys_id;\n  outputs.task_sys_id = gr.insert();\n})(inputs, outputs);", tags: 'flow designer action custom script' },
  { type: 'snippet', title: 'Check User Role', desc: 'Security role check', code: "if (!gs.hasRole('itil') && !gs.hasRole('admin')) {\n  gs.addErrorMessage('You do not have permission');\n  current.setAbortAction(true);\n  return;\n}", tags: 'security role acl permission check' },
  { type: 'snippet', title: 'setWorkflow(false)', desc: 'Skip business rules for batch ops', code: "var gr = new GlideRecord('incident');\ngr.addQuery('state', 7);\ngr.setWorkflow(false);\ngr.autoSysFields(false);\ngr.query();\nwhile (gr.next()) {\n  gr.active = false;\n  gr.update();\n}", tags: 'performance batch workflow skip' },
  { type: 'snippet', title: 'Transform Map Script', desc: 'Import data transformation', code: "(function runTransformScript(source, target, map, log, isUpdate) {\n  if (!source.u_email) { ignore = true; return; }\n  target.email = source.u_email.toLowerCase();\n  target.first_name = source.u_name.split(' ')[0];\n})(source, target, map, log, isUpdate);", tags: 'transform map import etl data' },
];

const METHODS = [
  { type: 'method', title: 'gr.addQuery(field, value)', desc: 'Add WHERE condition', tags: 'gliderecord query filter' },
  { type: 'method', title: 'gr.addEncodedQuery(str)', desc: 'Use encoded query string', tags: 'encoded query' },
  { type: 'method', title: 'gr.query()', desc: 'Execute the query', tags: 'query execute run' },
  { type: 'method', title: 'gr.next()', desc: 'Move to next record', tags: 'iterate loop next' },
  { type: 'method', title: 'gr.get(sysId)', desc: 'Get single record by sys_id', tags: 'get single record' },
  { type: 'method', title: 'gr.insert()', desc: 'Insert new record, returns sys_id', tags: 'insert create' },
  { type: 'method', title: 'gr.update()', desc: 'Update current record', tags: 'update save' },
  { type: 'method', title: 'gr.deleteRecord()', desc: 'Delete current record', tags: 'delete remove' },
  { type: 'method', title: 'gr.setLimit(n)', desc: 'Limit results for performance', tags: 'limit performance' },
  { type: 'method', title: 'gr.setWorkflow(false)', desc: 'Skip business rules', tags: 'workflow skip performance batch' },
  { type: 'method', title: 'gs.info(msg)', desc: 'Log info message', tags: 'log debug info' },
  { type: 'method', title: 'gs.getUserID()', desc: 'Current user sys_id', tags: 'user id current' },
  { type: 'method', title: 'gs.hasRole(role)', desc: 'Check if user has role', tags: 'role security check' },
  { type: 'method', title: 'gs.addInfoMessage(msg)', desc: 'Show info banner to user', tags: 'message banner info' },
  { type: 'method', title: 'g_form.getValue(field)', desc: 'Get field value (client)', tags: 'client form value get' },
  { type: 'method', title: 'g_form.setValue(field, val)', desc: 'Set field value (client)', tags: 'client form value set' },
  { type: 'method', title: 'g_form.setVisible(field, bool)', desc: 'Show/hide field', tags: 'client visibility show hide' },
  { type: 'method', title: 'g_form.setMandatory(field, bool)', desc: 'Set field required', tags: 'client mandatory required' },
];

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Use GET or POST' });

  const q = (req.method === 'POST' ? req.body?.query : req.query?.q) || '';
  if (!q.trim()) return res.status(200).json({ data: { results: [], total: 0 }, meta: { source: 'none' } });

  const searchTerm = q.trim().toLowerCase();
  const cacheKey = `usearch:${searchTerm}`;

  // Cache check
  const cached = await cacheGet(cacheKey);
  if (cached) { try { return res.status(200).json({ ...JSON.parse(cached), meta: { source: 'cache' } }); } catch {} }

  const results = [];

  // 1. Search spokes (DB)
  try {
    const spokeR = await query(
      `SELECT slug, name, description, category, icon, tags FROM sn_spokes 
       WHERE name ILIKE $1 OR description ILIKE $1 OR tags::text ILIKE $1
       ORDER BY view_count DESC LIMIT 8`,
      [`%${searchTerm}%`]
    );
    spokeR.rows.forEach(r => results.push({ type: 'spoke', title: r.name, desc: r.description, category: r.category, icon: r.icon, slug: r.slug, url: `/spokes/${r.slug}` }));
  } catch {}

  // 2. Search errors (DB)
  try {
    const errR = await query(
      `SELECT title, description, root_cause, fix_steps, category, severity FROM sn_error_encyclopedia
       WHERE error_pattern ILIKE $1 OR title ILIKE $1 OR description ILIKE $1 LIMIT 3`,
      [`%${searchTerm}%`]
    );
    errR.rows.forEach(r => results.push({ type: 'error', title: r.title, desc: r.description, root_cause: r.root_cause, fix_steps: r.fix_steps, severity: r.severity }));
  } catch {}

  // 3. Search version matrix (DB)
  try {
    const vmR = await query(
      `SELECT feature_name, description, category, versions FROM sn_version_matrix
       WHERE feature_name ILIKE $1 OR description ILIKE $1 LIMIT 3`,
      [`%${searchTerm}%`]
    );
    vmR.rows.forEach(r => results.push({ type: 'feature', title: r.feature_name, desc: r.description, category: r.category, versions: r.versions }));
  } catch {}

  // 4. Search snippets (in-memory — instant)
  SNIPPETS.filter(s => s.title.toLowerCase().includes(searchTerm) || s.desc.toLowerCase().includes(searchTerm) || s.tags.includes(searchTerm))
    .slice(0, 5)
    .forEach(s => results.push({ type: 'snippet', title: s.title, desc: s.desc, code: s.code }));

  // 5. Search methods (in-memory — instant)
  METHODS.filter(m => m.title.toLowerCase().includes(searchTerm) || m.desc.toLowerCase().includes(searchTerm) || m.tags.includes(searchTerm))
    .slice(0, 5)
    .forEach(m => results.push({ type: 'method', title: m.title, desc: m.desc }));

  const response = { data: { results, total: results.length, query: q.trim() }, meta: { source: 'database' } };

  // Cache for 5 minutes
  await cacheSet(cacheKey, JSON.stringify(response), 300).catch(() => {});

  return res.status(200).json(response);
}
