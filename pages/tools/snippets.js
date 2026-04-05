import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const SNIPPETS = [
  { id: 1, cat: 'GlideRecord', title: 'Query records with conditions', tags: ['query','filter','basic'], code: `var gr = new GlideRecord('incident');\ngr.addQuery('active', true);\ngr.addQuery('priority', 1);\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.number + ': ' + gr.short_description);\n}` },
  { id: 2, cat: 'GlideRecord', title: 'Insert a new record', tags: ['insert','create'], code: `var gr = new GlideRecord('incident');\ngr.initialize();\ngr.short_description = 'New incident from script';\ngr.priority = 2;\ngr.assignment_group.setDisplayValue('Service Desk');\nvar sysId = gr.insert();\ngs.info('Created: ' + sysId);` },
  { id: 3, cat: 'GlideRecord', title: 'Update multiple records', tags: ['update','batch'], code: `var gr = new GlideRecord('incident');\ngr.addQuery('state', 1); // New\ngr.addQuery('priority', 3);\ngr.query();\nwhile (gr.next()) {\n  gr.priority = 4;\n  gr.update();\n}\ngs.info('Updated ' + gr.getRowCount() + ' records');` },
  { id: 4, cat: 'GlideRecord', title: 'Delete with safety check', tags: ['delete','safety'], code: `var gr = new GlideRecord('u_temp_table');\ngr.addQuery('active', false);\ngr.query();\nvar count = 0;\nwhile (gr.next()) {\n  gr.deleteRecord();\n  count++;\n}\ngs.info('Deleted ' + count + ' records');` },
  { id: 5, cat: 'GlideRecord', title: 'Encoded query from URL', tags: ['encoded','query','url'], code: `var gr = new GlideRecord('incident');\ngr.addEncodedQuery('active=true^priority=1^stateIN1,2');\ngr.query();\ngs.info('Found: ' + gr.getRowCount());` },
  { id: 6, cat: 'GlideRecord', title: 'Get display value vs value', tags: ['display','reference'], code: `var gr = new GlideRecord('incident');\ngr.get('sys_id_here');\nvar assignedTo = gr.assigned_to;           // sys_id\nvar assignedName = gr.assigned_to.getDisplayValue(); // Name\nvar assignedEmail = gr.assigned_to.email;   // Dot-walk\ngs.info(assignedName + ' (' + assignedEmail + ')');` },
  { id: 7, cat: 'GlideRecord', title: 'Aggregate query (COUNT, SUM, AVG)', tags: ['aggregate','count','sum'], code: `var ga = new GlideAggregate('incident');\nga.addQuery('active', true);\nga.addAggregate('COUNT');\nga.addAggregate('AVG', 'reassignment_count');\nga.query();\nif (ga.next()) {\n  gs.info('Total: ' + ga.getAggregate('COUNT'));\n  gs.info('Avg reassignments: ' + ga.getAggregate('AVG', 'reassignment_count'));\n}` },
  { id: 8, cat: 'GlideRecord', title: 'GlideRecord with setLimit', tags: ['performance','limit'], code: `var gr = new GlideRecord('syslog');\ngr.addQuery('level', 0); // Errors only\ngr.orderByDesc('sys_created_on');\ngr.setLimit(10);\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.sys_created_on + ': ' + gr.message);\n}` },
  { id: 9, cat: 'Business Rule', title: 'Before insert — auto-fill fields', tags: ['before','insert','auto'], code: `// Before Insert Business Rule on 'incident'\n(function executeRule(current, previous) {\n  if (!current.assignment_group.nil()) {\n    var grp = current.assignment_group.getRefRecord();\n    current.assigned_to = grp.manager;\n  }\n  current.work_notes = 'Auto-assigned by business rule';\n})(current, previous);` },
  { id: 10, cat: 'Business Rule', title: 'After update — send notification', tags: ['after','update','notification'], code: `// After Update Business Rule on 'incident'\n(function executeRule(current, previous) {\n  if (current.state.changesTo(6)) { // Resolved\n    gs.eventQueue('incident.resolved', current, current.assigned_to, current.number);\n  }\n})(current, previous);` },
  { id: 11, cat: 'Client Script', title: 'onChange — show/hide field', tags: ['onchange','ui','visibility'], code: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading) return;\n  var show = (newValue == 'hardware');\n  g_form.setVisible('u_hardware_type', show);\n  g_form.setMandatory('u_hardware_type', show);\n}` },
  { id: 12, cat: 'Client Script', title: 'onLoad — set default values', tags: ['onload','default'], code: `function onLoad() {\n  if (g_form.isNewRecord()) {\n    g_form.setValue('priority', 3);\n    g_form.setValue('contact_type', 'phone');\n    g_form.addInfoMessage('Please fill all required fields');\n  }\n}` },
  { id: 13, cat: 'REST', title: 'Outbound REST call (GlideHTTPRequest)', tags: ['rest','api','outbound'], code: `var rm = new sn_ws.RESTMessageV2('My REST Message', 'POST');\nrm.setRequestHeader('Content-Type', 'application/json');\nrm.setRequestBody(JSON.stringify({\n  title: 'Test',\n  body: 'Hello from ServiceNow'\n}));\nvar response = rm.execute();\nvar body = response.getBody();\nvar code = response.getStatusCode();\ngs.info('Response ' + code + ': ' + body);` },
  { id: 14, cat: 'REST', title: 'Scripted REST API endpoint', tags: ['rest','inbound','api'], code: `// Scripted REST Resource (GET)\n(function process(request, response) {\n  var id = request.pathParams.id;\n  var gr = new GlideRecord('incident');\n  if (gr.get(id)) {\n    response.setBody({\n      number: gr.number.toString(),\n      state: gr.state.getDisplayValue(),\n      description: gr.short_description.toString()\n    });\n  } else {\n    response.setStatus(404);\n    response.setBody({ error: 'Not found' });\n  }\n})(request, response);` },
  { id: 15, cat: 'Flow Designer', title: 'Custom action — create task', tags: ['flow','action','custom'], code: `// Flow Designer Script Step\n(function execute(inputs, outputs) {\n  var gr = new GlideRecord('sc_task');\n  gr.initialize();\n  gr.short_description = inputs.description;\n  gr.assignment_group = inputs.group_sys_id;\n  gr.parent = inputs.ritm_sys_id;\n  outputs.task_sys_id = gr.insert();\n})(inputs, outputs);` },
  { id: 16, cat: 'Flow Designer', title: 'Subflow with error handling', tags: ['flow','subflow','error'], code: `// Flow Designer Script Step with try/catch\n(function execute(inputs, outputs) {\n  try {\n    var result = sn_fd.FlowAPI.startSubflow(\n      'My_Subflow', { record: inputs.record }\n    );\n    outputs.success = true;\n    outputs.message = 'Subflow started';\n  } catch (e) {\n    outputs.success = false;\n    outputs.message = e.getMessage();\n  }\n})(inputs, outputs);` },
  { id: 17, cat: 'Security', title: 'Check user role before action', tags: ['security','role','acl'], code: `if (!gs.hasRole('itil') && !gs.hasRole('admin')) {\n  gs.addErrorMessage('You do not have permission');\n  current.setAbortAction(true);\n  return;\n}\n// User has correct role, proceed\ngs.info('Action performed by: ' + gs.getUserName());` },
  { id: 18, cat: 'Security', title: 'Impersonate user safely', tags: ['impersonate','debug'], code: `// Run as specific user (Background Script)\nvar impUser = new GlideImpersonate();\nvar token = impUser.impersonate('admin_sys_id');\ntry {\n  // Code runs as impersonated user\n  gs.info('Running as: ' + gs.getUserName());\n} finally {\n  impUser.unimpersonate(token);\n}` },
  { id: 19, cat: 'Performance', title: 'Batch update with setWorkflow(false)', tags: ['performance','batch','workflow'], code: `var gr = new GlideRecord('incident');\ngr.addQuery('state', 7); // Closed\ngr.addQuery('sys_updated_on', '<', gs.daysAgoStart(90));\ngr.setWorkflow(false); // Skip business rules\ngr.autoSysFields(false); // Don't update sys_updated_on\ngr.query();\nwhile (gr.next()) {\n  gr.active = false;\n  gr.update();\n}` },
  { id: 20, cat: 'Performance', title: 'GlideRecord vs GlideAggregate', tags: ['performance','aggregate','count'], code: `// BAD — loads all records into memory\nvar gr = new GlideRecord('incident');\ngr.addQuery('active', true);\ngr.query();\ngs.info('Count: ' + gr.getRowCount()); // SLOW!\n\n// GOOD — uses SQL COUNT\nvar ga = new GlideAggregate('incident');\nga.addQuery('active', true);\nga.addAggregate('COUNT');\nga.query();\nif (ga.next()) gs.info('Count: ' + ga.getAggregate('COUNT'));` },
  { id: 21, cat: 'Integration', title: 'Spoke action — call REST from Flow', tags: ['spoke','integration','rest'], code: `// Integration Hub — Custom Spoke Action\n(function execute(inputs, outputs) {\n  var r = new sn_ws.RESTMessageV2();\n  r.setEndpoint(inputs.endpoint);\n  r.setHttpMethod('GET');\n  r.setRequestHeader('Authorization', 'Bearer ' + inputs.token);\n  var resp = r.execute();\n  outputs.status_code = resp.getStatusCode();\n  outputs.body = JSON.parse(resp.getBody());\n})(inputs, outputs);` },
  { id: 22, cat: 'Integration', title: 'Transform Map script', tags: ['import','transform','etl'], code: `// Transform Map onBefore script\n(function runTransformScript(source, target, map, log, isUpdate) {\n  // Skip if no email\n  if (!source.u_email) {\n    ignore = true;\n    return;\n  }\n  target.email = source.u_email.toLowerCase();\n  target.first_name = source.u_name.split(' ')[0];\n  target.last_name = source.u_name.split(' ').slice(1).join(' ');\n})(source, target, map, log, isUpdate);` },
];

const CATEGORIES = [...new Set(SNIPPETS.map(s => s.cat))];

export default function Snippets() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [copied, setCopied] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = SNIPPETS.filter(s => {
    if (cat !== 'All' && s.cat !== cat) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.tags.some(t => t.includes(q)) || s.code.toLowerCase().includes(q);
  });

  const copy = (code, id) => { navigator.clipboard.writeText(code); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <>
      <Head><title>Snippet Library — snspokes</title></Head>
      <Navbar />
      <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <section style={{ padding: '40px 24px 20px', borderBottom: '1px solid #1a1a2e' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
              <span className="gradient-text">Snippet Library</span>
            </h1>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>{SNIPPETS.length} ready-to-copy ServiceNow snippets — zero AI, instant results</p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search snippets... (press /)"
                  style={{ width: '100%', padding: '10px 16px 10px 36px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }} />
                <svg style={{ position: 'absolute', left: '12px', top: '12px' }} width="14" height="14" fill="none" stroke="#555" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['All', ...CATEGORIES].map(c => (
                <button key={c} onClick={() => setCat(c)}
                  style={{ padding: '5px 14px', background: cat === c ? 'rgba(108,99,255,0.15)' : 'transparent', border: '1px solid ' + (cat === c ? '#6c63ff40' : '#1e1e2e'), borderRadius: '20px', color: cat === c ? '#8b85ff' : '#666', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: cat === c ? '600' : '400' }}>
                  {c} {c === 'All' ? `(${SNIPPETS.length})` : `(${SNIPPETS.filter(s=>s.cat===c).length})`}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '24px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '12px' }}>
            {filtered.map(s => (
              <div key={s.id} className="fade-in" style={{ background: '#0d0d18', border: '1px solid #1a1a2e', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #141420' }}>
                  <div>
                    <h3 style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{s.title}</h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ fontSize: '11px', padding: '1px 8px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: '10px', color: '#8b85ff' }}>{s.cat}</span>
                      {s.tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: '10px', padding: '1px 6px', background: '#111827', border: '1px solid #1e1e2e', borderRadius: '6px', color: '#555' }}>{t}</span>)}
                    </div>
                  </div>
                  <button onClick={() => copy(s.code, s.id)}
                    style={{ padding: '6px 16px', background: copied === s.id ? 'rgba(74,222,128,0.15)' : 'rgba(108,99,255,0.1)', border: '1px solid ' + (copied === s.id ? 'rgba(74,222,128,0.25)' : 'rgba(108,99,255,0.2)'), borderRadius: '8px', color: copied === s.id ? '#4ade80' : '#8b85ff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', transition: 'all 0.2s' }}>
                    {copied === s.id ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <pre style={{ padding: '16px 18px', margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', lineHeight: '1.65', color: '#a8b2d8', overflow: 'auto', maxHeight: '250px' }}>{s.code}</pre>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
                <p>No snippets match your search</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
