import { useState } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const SECTIONS = [
  { title: 'GlideRecord Methods', items: [
    ['gr.addQuery(field, value)', 'Add WHERE condition'],
    ['gr.addEncodedQuery(str)', 'Use encoded query string'],
    ['gr.addOrCondition(field, value)', 'Add OR condition'],
    ['gr.query()', 'Execute the query'],
    ['gr.next()', 'Move to next record (returns boolean)'],
    ['gr.get(sysId)', 'Get single record by sys_id'],
    ['gr.getRowCount()', 'Count results (SLOW — use GlideAggregate)'],
    ['gr.insert()', 'Insert new record, returns sys_id'],
    ['gr.update()', 'Update current record'],
    ['gr.deleteRecord()', 'Delete current record'],
    ['gr.setLimit(n)', 'Limit results (IMPORTANT for perf)'],
    ['gr.orderBy(field)', 'Sort ascending'],
    ['gr.orderByDesc(field)', 'Sort descending'],
    ['gr.setWorkflow(false)', 'Skip business rules (batch ops)'],
    ['gr.initialize()', 'Prepare new empty record'],
    ['gr.getValue(field)', 'Get raw value'],
    ['gr.getDisplayValue(field)', 'Get display value'],
    ['gr.getUniqueValue()', 'Get sys_id of current record'],
  ]},
  { title: 'GlideSystem (gs)', items: [
    ['gs.info(msg)', 'Log info message'],
    ['gs.error(msg)', 'Log error message'],
    ['gs.getUserID()', 'Current user sys_id'],
    ['gs.getUserName()', 'Current username'],
    ['gs.getUser().getEmail()', 'Current user email'],
    ['gs.hasRole(role)', 'Check if user has role'],
    ['gs.addInfoMessage(msg)', 'Show info banner to user'],
    ['gs.addErrorMessage(msg)', 'Show error banner to user'],
    ['gs.now()', 'Current datetime string'],
    ['gs.nowDateTime()', 'Current datetime (GlideDateTime)'],
    ['gs.daysAgo(n)', 'Date n days ago'],
    ['gs.daysAgoStart(n)', 'Start of day n days ago'],
    ['gs.eventQueue(name, rec, p1, p2)', 'Fire event'],
    ['gs.getProperty(name)', 'Get system property'],
    ['gs.nil(value)', 'Check if empty/null'],
    ['gs.tableExists(name)', 'Check if table exists'],
  ]},
  { title: 'Client-Side (g_form)', items: [
    ['g_form.getValue(field)', 'Get field value'],
    ['g_form.setValue(field, value)', 'Set field value'],
    ['g_form.getDisplayValue(field)', 'Get display value'],
    ['g_form.setVisible(field, bool)', 'Show/hide field'],
    ['g_form.setMandatory(field, bool)', 'Set required'],
    ['g_form.setReadOnly(field, bool)', 'Set read-only'],
    ['g_form.addOption(field, value, label)', 'Add choice option'],
    ['g_form.clearOptions(field)', 'Remove all options'],
    ['g_form.showFieldMsg(field, msg, type)', 'Show field message'],
    ['g_form.addInfoMessage(msg)', 'Show info banner'],
    ['g_form.addErrorMessage(msg)', 'Show error banner'],
    ['g_form.isNewRecord()', 'Is this a new record?'],
    ['g_form.save()', 'Save the form'],
    ['g_form.submit()', 'Submit the form'],
  ]},
  { title: 'Encoded Query Operators', items: [
    ['field=value', 'Equals'],
    ['field!=value', 'Not equals'],
    ['fieldLIKEvalue', 'Contains'],
    ['fieldSTARTSWITHvalue', 'Starts with'],
    ['fieldENDSWITHvalue', 'Ends with'],
    ['field>value', 'Greater than'],
    ['field<value', 'Less than'],
    ['fieldIN1,2,3', 'In list'],
    ['fieldISEMPTY', 'Is empty'],
    ['fieldISNOTEMPTY', 'Is not empty'],
    ['fieldBETWEENa@b', 'Between a and b'],
    ['^', 'AND operator'],
    ['^OR', 'OR operator'],
    ['^NQ', 'New query (separate condition set)'],
  ]},
  { title: 'Useful Tables', items: [
    ['incident', 'Incidents (ITSM)'],
    ['change_request', 'Change requests'],
    ['problem', 'Problems'],
    ['sc_request / sc_req_item / sc_task', 'Service Catalog'],
    ['sys_user', 'Users'],
    ['sys_user_group', 'Groups'],
    ['cmdb_ci', 'Configuration items (CMDB)'],
    ['kb_knowledge', 'Knowledge articles'],
    ['sys_properties', 'System properties'],
    ['syslog', 'System logs'],
    ['sys_script', 'Business rules'],
    ['sys_ui_policy', 'UI policies'],
    ['sys_dictionary', 'Table/field definitions'],
  ]},
];

export default function Cheatsheet() {
  const [search, setSearch] = useState('');
  const filtered = SECTIONS.map(s => ({
    ...s,
    items: s.items.filter(([code, desc]) =>
      !search.trim() || code.toLowerCase().includes(search.toLowerCase()) || desc.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(s => s.items.length > 0);

  const copy = (text) => { navigator.clipboard.writeText(text); };

  return (
    <>
      <Head><title>Cheatsheet — snspokes</title></Head>
      <Navbar />
      <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <section style={{ padding: '40px 24px 20px', borderBottom: '1px solid #1a1a2e' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}><span className="gradient-text">ServiceNow Cheatsheet</span></h1>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>Every method you need, one page. Zero AI, instant lookup.</p>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter methods..." style={{ width: '100%', maxWidth: '400px', padding: '10px 16px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }} />
          </div>
        </section>
        <section style={{ padding: '24px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '24px' }}>
            {filtered.map(section => (
              <div key={section.title}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#8b85ff', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #1a1a2e' }}>{section.title}</h2>
                <div style={{ display: 'grid', gap: '2px' }}>
                  {section.items.map(([code, desc]) => (
                    <div key={code} onClick={() => copy(code)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#a8b2d8' }}>{code}</code>
                      <span style={{ fontSize: '12px', color: '#666' }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
