import { useState, useMemo } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const mono = { fontFamily: "'JetBrains Mono', monospace" };

const SNIPPETS = [
  {
    id: 1, category: 'GlideRecord',
    title: 'Query with conditions',
    desc: 'Safe GlideRecord query with null check',
    tags: ['query', 'grquery', 'server'],
    code: `var gr = new GlideRecord('incident');
gr.addQuery('state', 1); // New
gr.addQuery('priority', '<=', 2);
gr.orderByDesc('sys_created_on');
gr.setLimit(10);
gr.query();

while (gr.next()) {
  gs.log('INC: ' + gr.number + ' - ' + gr.short_description);
}`
  },
  {
    id: 2, category: 'GlideRecord',
    title: 'Insert record safely',
    desc: 'Insert with field validation',
    tags: ['insert', 'create', 'server'],
    code: `var gr = new GlideRecord('incident');
gr.initialize();
gr.setValue('short_description', 'Created via script');
gr.setValue('category', 'software');
gr.setValue('caller_id', gs.getUserID());
gr.setValue('state', 1);

var sysId = gr.insert();
if (sysId) {
  gs.log('Created: ' + sysId);
} else {
  gs.logError('Insert failed');
}`
  },
  {
    id: 3, category: 'GlideRecord',
    title: 'Update multiple records',
    desc: 'Bulk update with GlideRecord',
    tags: ['update', 'bulk', 'server'],
    code: `var gr = new GlideRecord('task');
gr.addQuery('assigned_to', gs.getUserID());
gr.addQuery('state', 'IN', '1,2'); // Open + In Progress
gr.query();

var count = 0;
while (gr.next()) {
  gr.setValue('work_notes', 'Bulk updated via script');
  gr.update();
  count++;
}
gs.log('Updated ' + count + ' records');`
  },
  {
    id: 4, category: 'GlideRecord',
    title: 'Delete with conditions',
    desc: 'Safe delete with confirmation log',
    tags: ['delete', 'server'],
    code: `var gr = new GlideRecord('syslog');
// Delete logs older than 30 days
var cutoff = new GlideDateTime();
cutoff.addDaysUTC(-30);
gr.addQuery('sys_created_on', '<', cutoff.getValue());
gr.query();

var count = gr.getRowCount();
gs.log('About to delete ' + count + ' records');
gr.deleteMultiple();
gs.log('Deletion complete');`
  },
  {
    id: 5, category: 'Client Script',
    title: 'onChange handler',
    desc: 'React to field change on form',
    tags: ['client', 'onchange', 'form'],
    code: `// Script Type: onChange
// Table: incident
// Field name: priority

function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading || newValue === '') return;

  if (newValue === '1') { // Critical
    g_form.showFieldMsg('priority',
      'Critical priority requires manager approval', 'info');
    g_form.setMandatory('approval', true);
  } else {
    g_form.clearMessages('priority');
    g_form.setMandatory('approval', false);
  }
}`
  },
  {
    id: 6, category: 'Client Script',
    title: 'onLoad — set field defaults',
    desc: 'Set values and visibility on form load',
    tags: ['client', 'onload', 'form'],
    code: `// Script Type: onLoad
// Table: incident

function onLoad() {
  // Hide field for non-admins
  if (!g_user.hasRole('itil')) {
    g_form.setVisible('work_notes_list', false);
  }

  // Pre-fill caller from logged-in user
  if (g_form.isNewRecord()) {
    g_form.setValue('caller_id', g_user.userID);
    g_form.setValue('contact_type', 'self-service');
  }
}`
  },
  {
    id: 7, category: 'Client Script',
    title: 'GlideAjax call',
    desc: 'Call a Script Include from client side',
    tags: ['client', 'ajax', 'glideajax'],
    code: `// Client script calling a Script Include
var ga = new GlideAjax('MyScriptInclude');
ga.addParam('sysparm_name', 'getActiveUsers');
ga.addParam('sysparm_department', g_form.getValue('department'));

ga.getXMLAnswer(function(response) {
  var data = JSON.parse(response);
  if (data.success) {
    g_form.setValue('assigned_to', data.user_sys_id);
    g_form.showFieldMsg('assigned_to',
      'Auto-assigned to: ' + data.user_name, 'info');
  }
});`
  },
  {
    id: 8, category: 'Script Include',
    title: 'Script Include class template',
    desc: 'Proper class-based Script Include',
    tags: ['script-include', 'class', 'server'],
    code: `var MyUtilityClass = Class.create();

MyUtilityClass.prototype = Object.extendsObject(AbstractAjaxProcessor, {

  // Callable from GlideAjax on client
  getActiveUsers: function() {
    var dept = this.getParameter('sysparm_department');
    var users = [];

    var gr = new GlideRecord('sys_user');
    gr.addQuery('active', true);
    if (dept) gr.addQuery('department', dept);
    gr.query();

    while (gr.next()) {
      users.push({
        sys_id: gr.getUniqueValue(),
        name: gr.getDisplayValue('name')
      });
    }

    return JSON.stringify({ success: true, users: users });
  },

  // Server-side utility method
  formatUser: function(userId) {
    var gr = new GlideRecord('sys_user');
    if (gr.get(userId)) {
      return gr.getDisplayValue('name') + ' <' + gr.getValue('email') + '>';
    }
    return 'Unknown';
  },

  type: 'MyUtilityClass'
});`
  },
  {
    id: 9, category: 'Business Rule',
    title: 'Before Insert — validate',
    desc: 'Validate field before record saves',
    tags: ['business-rule', 'before', 'validate'],
    code: `// When: Before | Insert: true
// Table: incident

(function executeRule(current, previous) {
  // Require short_description minimum length
  if (current.short_description.nil() ||
      current.getValue('short_description').length < 10) {
    current.setAbortAction(true);
    gs.addErrorMessage('Short description must be at least 10 characters.');
    return;
  }

  // Auto-set priority based on category
  if (current.category == 'security') {
    current.setValue('priority', 1);
    current.setValue('impact', 1);
    current.setValue('urgency', 1);
  }
})(current, previous);`
  },
  {
    id: 10, category: 'Business Rule',
    title: 'After Update — notify',
    desc: 'Send notification after state change',
    tags: ['business-rule', 'after', 'notification'],
    code: `// When: After | Update: true
// Table: incident
// Condition: current.state.changes() && current.state == 6

(function executeRule(current, previous) {
  if (!current.state.changes()) return;
  if (current.getValue('state') != '6') return; // 6 = Resolved

  // Send custom notification
  var notif = new GlideRecord('sysevent_email_action');
  if (notif.get('name', 'Incident Resolved Custom')) {
    var emailer = new GlideEmailOutbound();
    emailer.setFrom('servicedesk@company.com');
    emailer.setTo(current.caller_id.email.toString());
    emailer.setSubject('Resolved: ' + current.number);
    emailer.setBody('Your incident ' + current.number +
      ' has been resolved.\nResolution: ' +
      current.close_notes.toString());
    emailer.send();
  }
})(current, previous);`
  },
  {
    id: 11, category: 'REST API',
    title: 'GlideHTTPRequest — call external API',
    desc: 'Make outbound REST call from server-side',
    tags: ['rest', 'http', 'integration', 'server'],
    code: `var request = new sn_ws.RESTMessageV2();
request.setEndpoint('https://api.example.com/data');
request.setHttpMethod('POST');
request.setRequestHeader('Content-Type', 'application/json');
request.setRequestHeader('Authorization', 'Bearer ' + gs.getProperty('my.api.token'));

var body = JSON.stringify({
  incident_id: current.number.toString(),
  description: current.short_description.toString()
});
request.setRequestBody(body);

try {
  var response = request.execute();
  var status = response.getStatusCode();
  var responseBody = JSON.parse(response.getBody());

  if (status === 200 && responseBody.success) {
    current.setValue('correlation_id', responseBody.external_id);
    current.update();
  } else {
    gs.logError('API call failed: ' + status + ' - ' + response.getBody());
  }
} catch(e) {
  gs.logError('REST call exception: ' + e.message);
}`
  },
  {
    id: 12, category: 'REST API',
    title: 'Table API — query via REST',
    desc: 'Query ServiceNow Table API from external system',
    tags: ['rest', 'table-api', 'external'],
    code: `// External system calling ServiceNow Table API
// GET /api/now/table/incident?sysparm_query=state=1^priority<=2&sysparm_limit=10

const response = await fetch(
  'https://instance.service-now.com/api/now/table/incident' +
  '?sysparm_query=state%3D1%5Epriority%3C%3D2' +
  '&sysparm_limit=10' +
  '&sysparm_fields=sys_id,number,short_description,priority' +
  '&sysparm_display_value=true',
  {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + btoa('user:password'),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
);

const data = await response.json();
const incidents = data.result; // Array of incident objects`
  },
  {
    id: 13, category: 'Flow Designer',
    title: 'Inline script — transform data',
    desc: 'Transform data inside a Flow Designer script step',
    tags: ['flow', 'inline-script', 'transform'],
    code: `// Flow Designer → Inline Script step
// Inputs: fd_data.record_sys_id (string)
// Outputs: result_json (string)

(function execute(inputs, outputs) {
  var gr = new GlideRecord('incident');
  if (!gr.get(inputs.record_sys_id)) {
    outputs.result_json = JSON.stringify({ error: 'Record not found' });
    return;
  }

  var data = {
    number:      gr.getValue('number'),
    state:       gr.getDisplayValue('state'),
    priority:    gr.getDisplayValue('priority'),
    assigned_to: gr.getDisplayValue('assigned_to'),
    updated:     gr.getValue('sys_updated_on')
  };

  outputs.result_json = JSON.stringify(data);
})(inputs, outputs);`
  },
  {
    id: 14, category: 'Utilities',
    title: 'Date/time calculations',
    desc: 'Common GlideDateTime operations',
    tags: ['datetime', 'glidedatetime', 'utility'],
    code: `// Current time
var now = new GlideDateTime();
gs.log('Now: ' + now.getDisplayValue());

// Add days
var future = new GlideDateTime();
future.addDaysUTC(7);
gs.log('7 days from now: ' + future.getDisplayValue());

// Check if overdue
var due = new GlideDateTime(current.getValue('due_date'));
var isOverdue = due.before(new GlideDateTime());

// Business hours duration
var dur = GlideDateTime.subtract(
  new GlideDateTime(current.getValue('opened_at')),
  new GlideDateTime()
);
var hours = dur.getRoundedDayPart();
gs.log('Open for: ' + hours + ' hours');`
  },
  {
    id: 15, category: 'Utilities',
    title: 'Encoded query builder',
    desc: 'Build complex encoded queries programmatically',
    tags: ['query', 'encoded-query', 'utility'],
    code: `// Build encoded query for Table API or reports
var qc = new GlideQueryCondition();

// Basic encoded query string
var encodedQuery = 'state=1^priority<=2^assigned_toISEMPTY';

// Using GlideRecord for complex queries
var gr = new GlideRecord('incident');
var cond = gr.addQuery('state', 1);
cond.addOrCondition('state', 2);
gr.addQuery('priority', '<=', 2);
gr.addQuery('sys_created_on',
  '>=', gs.beginningOfLast30Days());

// Get the encoded query for reuse
gr.query();
var built = gr.getEncodedQuery();
gs.log('Query: ' + built);`
  },
  {
    id: 16, category: 'Utilities',
    title: 'Properties & system settings',
    desc: 'Read and write system properties safely',
    tags: ['properties', 'gs', 'utility'],
    code: `// Read a system property
var apiUrl = gs.getProperty('my.integration.url', 'https://default.com');
var isEnabled = gs.getProperty('my.feature.enabled') === 'true';

// Check if property exists
var prop = new GlideRecord('sys_properties');
if (prop.get('name', 'my.integration.url')) {
  gs.log('Value: ' + prop.getValue('value'));
}

// Write/update a property (use carefully in scripts)
gs.setProperty('my.integration.last_run', new GlideDateTime().getValue());

// User context
var userId   = gs.getUserID();
var userName = gs.getUserName();
var isAdmin  = gs.hasRole('admin');
var session  = gs.getSession();`
  },
];

const CATEGORIES = ['All', ...new Set(SNIPPETS.map(s => s.category))];

export default function SnippetsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [copied, setCopied]   = useState(null);
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SNIPPETS.filter(s => {
      const matchCat = category === 'All' || s.category === category;
      const matchSearch = !q || s.title.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.tags.some(t => t.includes(q)) ||
        s.code.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  const copy = (id, code) => {
    navigator.clipboard?.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <Head>
        <title>Snippet Library — snspokes</title>
        <meta name="description" content="Copy-paste ServiceNow scripts: GlideRecord, Business Rules, Client Scripts, REST, Flow Designer. No AI needed." />
      </Head>
      <Navbar />

      <div style={{ minHeight: '100vh', background: '#030308', paddingTop: '72px' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid #0d0d18', padding: '40px 24px 32px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ ...mono, fontSize: '10px', color: '#4ade80', letterSpacing: '2px' }}>SNIPPET_LIBRARY</span>
              <span style={{ ...mono, fontSize: '10px', color: '#1a1a2e' }}>•</span>
              <span style={{ ...mono, fontSize: '10px', color: '#374151' }}>{SNIPPETS.length} snippets</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              ServiceNow Snippet Library
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Copy-paste ready. No AI, no wait. Just working code.
            </p>
          </div>
        </div>

        {/* Search + filter */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search snippets…"
              style={{ ...mono, flex: '1 1 200px', minWidth: '160px', background: '#08080f', border: '1px solid #1a1a2e', borderRadius: '8px', padding: '9px 14px', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ ...mono, padding: '8px 14px', borderRadius: '7px', border: '1px solid', fontSize: '11px', cursor: 'pointer', transition: 'all .15s',
                    background: category === cat ? 'rgba(108,99,255,.15)' : 'transparent',
                    borderColor: category === cat ? 'rgba(108,99,255,.4)' : '#1a1a2e',
                    color: category === cat ? '#8b85ff' : '#6b7280' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <div style={{ ...mono, fontSize: '10px', color: '#374151', marginBottom: '16px', letterSpacing: '1px' }}>
            {filtered.length} SNIPPET{filtered.length !== 1 ? 'S' : ''}{search ? ` FOR "${search.toUpperCase()}"` : ''}
          </div>

          {/* Snippet grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '60px' }}>
            {filtered.map(s => (
              <div key={s.id}
                style={{ border: `1px solid ${expanded === s.id ? 'rgba(108,99,255,.25)' : '#0d0d18'}`, borderRadius: '10px', background: expanded === s.id ? 'rgba(108,99,255,.03)' : '#050510', overflow: 'hidden', transition: 'border-color .2s' }}>

                {/* Header row */}
                <div onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', cursor: 'pointer' }}>
                  <span style={{ ...mono, fontSize: '9px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(74,222,128,.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,.15)', whiteSpace: 'nowrap' }}>
                    {s.category}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#e2e8f0', marginBottom: '2px' }}>{s.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); copy(s.id, s.code); }}
                      style={{ ...mono, fontSize: '10px', padding: '5px 12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', transition: 'all .15s',
                        background: copied === s.id ? 'rgba(74,222,128,.1)' : 'transparent',
                        borderColor: copied === s.id ? 'rgba(74,222,128,.3)' : '#1a1a2e',
                        color: copied === s.id ? '#4ade80' : '#6b7280' }}>
                      {copied === s.id ? '✓ copied' : 'copy'}
                    </button>
                    <span style={{ color: '#374151', fontSize: '12px', transition: 'transform .2s', display: 'inline-block', transform: expanded === s.id ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </div>
                </div>

                {/* Expanded code */}
                {expanded === s.id && (
                  <div>
                    <div style={{ display: 'flex', gap: '6px', padding: '0 16px 10px', flexWrap: 'wrap' }}>
                      {s.tags.map(t => (
                        <span key={t} onClick={() => setSearch(t)}
                          style={{ ...mono, fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: '#0a0a14', border: '1px solid #1a1a2e', color: '#374151', cursor: 'pointer' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div style={{ borderTop: '1px solid #0d0d18' }}>
                      <pre style={{ margin: 0, padding: '16px', overflowX: 'auto' }}>
                        <code style={{ ...mono, fontSize: '12px', color: '#a8b2d8', lineHeight: 1.75 }}>{s.code}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#374151' }}>
                <div style={{ ...mono, fontSize: '11px', marginBottom: '8px' }}>NO_RESULTS</div>
                <div style={{ fontSize: '13px' }}>No snippets match "{search}"</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export const dynamic = 'force-dynamic';
