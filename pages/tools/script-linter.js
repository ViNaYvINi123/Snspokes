import { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import axios from 'axios';

const GRADE_COLOR = { A:'#16a34a', B:'#2563eb', C:'#d97706', D:'#ea580c', F:'#dc2626' };
const GRADE_BG    = { A:'#f0fdf4', B:'#eff6ff', C:'#fffbeb', D:'#fff7ed', F:'#fef2f2' };
const SEV_COLOR   = { error:'#dc2626', warning:'#d97706', info:'#2563eb' };
const SEV_BG      = { error:'#2d0a0a', warning:'#1a1200', info:'#0a1628' };
const SEV_BORDER  = { error:'#fecaca', warning:'#fde68a', info:'#bfdbfe' };

const SCRIPT_TYPES = ['server','client_script','business_rule','script_include','scheduled_job','rest_api'];

const SAMPLE_SCRIPTS = {
  good: `/**
 * Business Rule: Auto-assign incident based on category
 * Table: incident | When: before insert
 */
(function executeRule(current, previous) {
  try {
    var categoryGroupMap = {
      'Software': 'software-support-group-sys-id',
      'Hardware': 'hardware-support-group-sys-id',
      'Network': 'network-support-group-sys-id'
    };
    
    var category = current.category.toString();
    if (categoryGroupMap[category]) {
      current.assignment_group = categoryGroupMap[category];
    }
  } catch(e) {
    gs.error('AutoAssign BR failed: ' + e.message, 'AutoAssignBR');
  }
})(current, previous);`,

  bad: `var gr = new GlideRecord('incident');
gr.addQuery('state', '1');
while(gr.next()) {
  gs.log('Processing: ' + gr.number);
  gr.update();
  
  var gr2 = new GlideRecord('task');
  gr2.addQuery('parent', gr.sys_id);
  while(gr2.next()) {
    gr2.state = 3;
    gr2.update();
  }
}`,
};

export default function ScriptLinter() {
  const [script, setScript] = useState('');
  const [scriptType, setScriptType] = useState('server');
  const [aiReview, setAiReview] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const lint = async () => {
    if (!script.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await axios.post('/api/tools/script-linter', { script, script_type: scriptType, ai_review: aiReview });
      setResult(res.data);
    } catch (err) { setError(err.response?.data?.error || 'Lint failed. Check your script and try again.'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Head>
        <title>Script Linter — snspokes</title>
        <meta name="description" content="Analyze your ServiceNow scripts for performance issues, bugs, and security vulnerabilities." />
      </Head>
      <Navbar />
      <div style={{ minHeight: '100vh', background: '#0a0a0f', paddingTop: '24px', paddingBottom: '48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#ef4444,#f59e0b)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔬</div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#e2e8f0', letterSpacing: '-0.5px' }}>Script Linter & Analyzer</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#6b6b8a' }}>Paste any ServiceNow script. Get instant detection of bugs, performance issues, and security vulnerabilities.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', alignItems: 'start' }}>
            <div>
              {/* Options */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={scriptType} onChange={e => setScriptType(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #1e1e2e', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', background: '#0f0f1a' }}>
                  {SCRIPT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: '#9999bb', cursor: 'pointer' }}>
                  <input type="checkbox" checked={aiReview} onChange={e => setAiReview(e.target.checked)} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                  Include AI deep review
                </label>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                  <button onClick={() => setScript(SAMPLE_SCRIPTS.good)} style={{ padding: '5px 12px', background: '#052e16', border: '1px solid #16a34a44', borderRadius: '6px', fontSize: '12px', color: '#4ade80', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>Load Good Example</button>
                  <button onClick={() => setScript(SAMPLE_SCRIPTS.bad)} style={{ padding: '5px 12px', background: '#2d0a0a', border: '1px solid #ef444444', borderRadius: '6px', fontSize: '12px', color: '#f87171', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>Load Bad Example</button>
                </div>
              </div>

              {/* Editor */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <textarea value={script} onChange={e => setScript(e.target.value)} rows={16}
                  placeholder="Paste your ServiceNow script here..."
                  style={{ width: '100%', padding: '14px', border: '1px solid #1e1e2e', borderRadius: '10px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', resize: 'vertical', outline: 'none', color: '#e2e8f0', background: '#0f172a', lineHeight: '1.7' }} />
                {script && <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '11px', color: '#4b5563' }}>{script.split('\n').length} lines</div>}
              </div>

              {error && (
                <div style={{ padding:'12px 16px', background:'#2d0a0a', border:'1px solid #ef444433', borderRadius:'10px', color:'#f87171', fontSize:'13px', marginBottom:'12px' }}>⚠️ {error}</div>
              )}
              <button onClick={lint} disabled={loading || !script.trim()}
                style={{ width: '100%', padding: '11px', background: loading || !script.trim() ? '#9ca3af' : 'linear-gradient(135deg,#ef4444,#f59e0b)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: loading || !script.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                {loading && <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
                {loading ? (aiReview ? 'Analyzing with AI...' : 'Linting...') : '🔬 Analyze Script'}
              </button>

              {/* Results */}
              {result && (
                <div>
                  {/* Score header */}
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '16px 20px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: `2px solid ${GRADE_COLOR[result.grade]}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: '26px', fontWeight: '800', color: GRADE_COLOR[result.grade], lineHeight: '1' }}>{result.grade}</div>
                      <div style={{ fontSize: '10px', color: GRADE_COLOR[result.grade], fontWeight: '600' }}>{result.score}/100</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', marginBottom: '6px' }}>
                        {result.grade === 'A' ? '✅ Excellent script!' : result.grade === 'B' ? '👍 Good script, minor improvements possible' : result.grade === 'C' ? '⚠️ Several issues need attention' : '❌ Critical issues found'}
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {result.summary.errors > 0 && <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>❌ {result.summary.errors} errors</span>}
                        {result.summary.warnings > 0 && <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '600' }}>⚠️ {result.summary.warnings} warnings</span>}
                        {result.summary.info > 0 && <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>ℹ️ {result.summary.info} suggestions</span>}
                        {result.summary.errors === 0 && result.summary.warnings === 0 && <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>✅ No issues found</span>}
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  {result.issues.map((issue, i) => (
                    <div key={i} style={{ padding: '12px 16px', marginBottom: '8px', borderRadius: '10px', background: issue.severity==='error'?'#2d0a0a':issue.severity==='warning'?'#1a1200':'#0a1628', border: `1px solid ${issue.severity==='error'?'#ef444433':issue.severity==='warning'?'#f59e0b33':'#3b82f633'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.7)', border: `1px solid ${SEV_BORDER[issue.severity]}`, color: SEV_COLOR[issue.severity], fontWeight: '700' }}>{issue.severity}</span>
                        <span style={{ fontSize: '11px', color: '#6b6b8a', fontWeight: '600' }}>{issue.category}</span>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', margin: '0 0 5px' }}>{issue.message}</p>
                      <p style={{ fontSize: '12px', color: '#6b6b8a', margin: 0 }}>💡 {issue.fix}</p>
                    </div>
                  ))}

                  {/* AI Review */}
                  {result.ai_review && (
                    <div style={{ padding: '16px', background: '#1a1635', border: '1px solid #6c63ff44', borderRadius: '10px', marginTop: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#8b85ff', marginBottom: '10px' }}>🤖 AI Deep Review</div>
                      <p style={{ fontSize: '13px', color: '#9999bb', lineHeight: '1.6', marginBottom: '10px' }}>{result.ai_review.summary}</p>
                      {result.ai_review.critical_issues?.map((i, idx) => (
                        <div key={idx} style={{ padding: '6px 10px', background: '#2d0a0a', borderRadius: '6px', fontSize: '12px', color: '#f87171', marginBottom: '5px' }}>❌ {i}</div>
                      ))}
                      {result.ai_review.suggestions?.map((s, idx) => (
                        <div key={idx} style={{ padding: '6px 10px', background: '#111827', borderRadius: '6px', fontSize: '12px', color: '#9999bb', marginBottom: '5px', border: '1px solid #2a2a3e' }}>💡 {s}</div>
                      ))}
                      {result.ai_review.optimized_snippet && (
                        <pre style={{ padding: '12px', background: '#0f172a', color: '#e2e8f0', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace', overflowX: 'auto', marginTop: '10px' }}>{result.ai_review.optimized_snippet}</pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div>
              <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #1e1e2e' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#9999bb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 What We Check</span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  {[
                    { cat: 'Performance', icon: '⚡', checks: ['Missing setLimit()', 'getRowCount() usage', 'Update inside loop', 'Nested GlideRecord', 'Sync GlideAjax'] },
                    { cat: 'Bugs', icon: '🐛', checks: ['No gr.query() called', 'GlideRecord in client', 'Missing null checks'] },
                    { cat: 'Security', icon: '🔒', checks: ['Hardcoded sys_ids', 'eval() usage', 'Missing input validation'] },
                    { cat: 'Best Practices', icon: '✅', checks: ['No try/catch on REST', 'Deprecated gs.log()', 'Missing comments'] },
                  ].map(section => (
                    <div key={section.cat} style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#9999bb', marginBottom: '6px' }}>{section.icon} {section.cat}</div>
                      {section.checks.map(c => (
                        <div key={c} style={{ fontSize: '11px', color: '#6b6b8a', padding: '2px 0', paddingLeft: '12px' }}>• {c}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
