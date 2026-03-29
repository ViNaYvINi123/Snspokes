import { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import axios from 'axios';

const CODE_TYPE_CONFIG = {
  business_rule:  { icon: '⚡', color: '#6c63ff', label: 'Business Rule' },
  script_include: { icon: '📦', color: '#0ea5e9', label: 'Script Include' },
  client_script:  { icon: '🖥️', color: '#10b981', label: 'Client Script' },
  scheduled_job:  { icon: '⏰', color: '#f59e0b', label: 'Scheduled Job' },
  rest_api:       { icon: '🔌', color: '#ef4444', label: 'REST API' },
  transform_map:  { icon: '🔄', color: '#8b5cf6', label: 'Transform Map' },
  flow_script:    { icon: '⚙️', color: '#06b6d4', label: 'Flow Script' },
};

const QUICK_PROMPTS = {
  business_rule: [
    'Send Slack notification when incident priority changes to 1',
    'Auto-assign incident to correct group based on category',
    'Set resolved date when state changes to Resolved',
    'Prevent closing incident without resolution notes',
    'Calculate SLA breach date on incident creation',
  ],
  script_include: [
    'Utility class to send email with HTML template',
    'Helper to create incident with all required fields',
    'Class to query user by email and return full profile',
    'Utility to log errors to custom error table',
  ],
  client_script: [
    'Show/hide field based on category selection',
    'Auto-populate assignment group based on location',
    'Validate email format on form submission',
    'Make short_description mandatory when priority is 1',
  ],
  scheduled_job: [
    'Daily job to close resolved incidents older than 7 days',
    'Weekly report of open P1 incidents emailed to managers',
    'Hourly sync of user data from LDAP',
    'Daily cleanup of records older than 1 year',
  ],
  rest_api: [
    'REST endpoint to create incident from external system',
    'API to get user details and assigned incidents',
    'Endpoint to update CI status in CMDB',
    'REST API for mobile app to fetch open tasks',
  ],
};

export default function CodeGenerator() {
  const [codeType, setCodeType] = useState('business_rule');
  const [prompt, setPrompt] = useState('');
  const [config, setConfig] = useState({ tableName: 'incident', when: 'before' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await axios.post('/api/tools/code-generator', { prompt, code_type: codeType, config });
      setResult(res.data);
      setHistory(h => [{ prompt, code_type: codeType, code: res.data.code, ts: new Date() }, ...h].slice(0, 10));
    } catch (err) {
      alert(err.response?.data?.error || 'Generation failed');
    } finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(result?.code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cfg = CODE_TYPE_CONFIG[codeType] || CODE_TYPE_CONFIG.business_rule;

  return (
    <>
      <Head>
        <title>AI Code Generator — snspokes</title>
        <meta name="description" content="Generate production-ready ServiceNow scripts instantly. Business Rules, Script Includes, Client Scripts and more." />
      </Head>
      <Navbar />
      <div style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: '24px', paddingBottom: '48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 16px' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#6c63ff,#a855f7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🤖</div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>AI Code Generator</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Describe what you need in plain English. Get production-ready ServiceNow code instantly.</p>
          </div>

          {/* Code type selector */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {Object.entries(CODE_TYPE_CONFIG).map(([type, conf]) => (
              <button key={type} onClick={() => { setCodeType(type); setResult(null); }}
                style={{ padding: '8px 14px', borderRadius: '9px', border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: codeType === type ? '700' : '500', transition: 'all 0.12s', background: codeType === type ? conf.color : '#fff', borderColor: codeType === type ? conf.color : '#e5e7eb', color: codeType === type ? '#fff' : '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {conf.icon} {conf.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }}>
            <div>
              {/* Config row */}
              {(codeType === 'business_rule' || codeType === 'client_script') && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Table</label>
                    <input value={config.tableName} onChange={e => setConfig(c => ({ ...c, tableName: e.target.value }))} placeholder="incident" style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>{codeType === 'client_script' ? 'Type' : 'When'}</label>
                    <select value={config.when} onChange={e => setConfig(c => ({ ...c, when: e.target.value }))} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}>
                      {codeType === 'client_script'
                        ? ['onLoad', 'onChange', 'onSubmit', 'onCellEdit'].map(w => <option key={w}>{w}</option>)
                        : ['before', 'after', 'async', 'display'].map(w => <option key={w}>{w}</option>)
                      }
                    </select>
                  </div>
                </div>
              )}

              {/* Prompt input */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{cfg.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Describe your {cfg.label}</span>
                </div>
                <div style={{ padding: '14px' }}>
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate(); }}
                    placeholder={`e.g. "${(QUICK_PROMPTS[codeType] || [])[0] || 'Describe what you need...'}"`}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#111827', lineHeight: '1.6' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>⌘+Enter to generate</span>
                    <button onClick={generate} disabled={loading || !prompt.trim()}
                      style={{ padding: '9px 24px', background: loading || !prompt.trim() ? '#9ca3af' : `linear-gradient(135deg,${cfg.color},#a855f7)`, border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {loading && <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
                      {loading ? 'Generating...' : '✨ Generate Code'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Result */}
              {result && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{cfg.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Generated {cfg.label}</span>
                      {result.model && <span style={{ fontSize: '11px', color: '#9ca3af' }}>via {result.model}</span>}
                    </div>
                    <button onClick={copy} style={{ padding: '5px 14px', background: copied ? '#f0fdf4' : '#f9fafb', border: `1px solid ${copied ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '6px', fontSize: '12px', color: copied ? '#16a34a' : '#374151', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
                      {copied ? '✅ Copied!' : '📋 Copy Code'}
                    </button>
                  </div>
                  <pre style={{ padding: '16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#e2e8f0', background: '#0f172a', margin: 0, overflowX: 'auto', lineHeight: '1.7', maxHeight: '500px', overflowY: 'auto' }}>
                    {result.code}
                  </pre>
                </div>
              )}
            </div>

            {/* Right sidebar — quick prompts + history */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💡 Quick Prompts</span>
                </div>
                <div style={{ padding: '6px' }}>
                  {(QUICK_PROMPTS[codeType] || []).map((p, i) => (
                    <button key={i} onClick={() => setPrompt(p)}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit', lineHeight: '1.5', transition: 'all 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#111827'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280'; }}
                    >{p}</button>
                  ))}
                </div>
              </div>

              {history.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🕐 History</span>
                    <button onClick={() => setHistory([])} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#9ca3af', cursor: 'pointer' }}>Clear</button>
                  </div>
                  <div style={{ padding: '6px' }}>
                    {history.map((h, i) => (
                      <button key={i} onClick={() => { setCodeType(h.code_type); setPrompt(h.prompt); setResult({ code: h.code }); }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'all 0.1s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#111827'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280'; }}
                      >
                        <span style={{ marginRight: '6px' }}>{CODE_TYPE_CONFIG[h.code_type]?.icon}</span>{h.prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
