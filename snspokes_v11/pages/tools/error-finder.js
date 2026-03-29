import { useState, useRef } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import axios from 'axios';

const CATEGORIES = ['All','Script','API','Flow','DB','Auth','Spoke','Platform'];
const SEV_COLORS = { critical:'#dc2626', high:'#ea580c', medium:'#d97706', low:'#16a34a' };
const SEV_BG = { critical:'#fef2f2', high:'#fff7ed', medium:'#fffbeb', low:'#f0fdf4' };

export default function ErrorFinder() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [context, setContext] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const timer = useRef(null);

  const search = async (q, cat = category) => {
    if (!q.trim() && !cat) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await axios.get('/api/tools/error-search', { params: { q, category: cat } });
      setResults(res.data.errors || []);
    } catch {} finally { setLoading(false); }
  };

  const handleInput = (val) => {
    setQuery(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(val), 500);
  };

  const aiAnalyze = async () => {
    if (!query.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await axios.post('/api/tools/error-search', { action: 'ai_analyze', error_message: query, context });
      setAiResult(res.data);
    } catch (err) {
      alert('AI analysis failed');
    } finally { setAiLoading(false); }
  };

  const markHelpful = (id) => {
    axios.post('/api/tools/error-search', { action: 'helpful', id }).catch(() => {});
    setResults(r => r.map(e => e.id === id ? { ...e, helpful_count: (e.helpful_count || 0) + 1 } : e));
  };

  return (
    <>
      <Head>
        <title>ServiceNow Error Finder — snspokes</title>
        <meta name="description" content="Search and fix any ServiceNow error. AI-powered root cause analysis and step-by-step fixes." />
      </Head>
      <Navbar />
      <div style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: '24px', paddingBottom: '48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}>

          {/* Header */}
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔴</div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px', marginBottom: '8px' }}>ServiceNow Error Finder</h1>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Paste your error message. Get root cause + fix steps instantly. AI-powered for errors not in the database.</p>
          </div>

          {/* Search */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <textarea value={query} onChange={e => handleInput(e.target.value)} rows={3}
                placeholder='Paste your error message here...&#10;e.g. "Transaction cancelled: maximum execution time exceeded"&#10;or "GlideRecord is not defined"'
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', resize: 'vertical', outline: 'none', color: '#111827', lineHeight: '1.6' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => { setCategory(c === 'All' ? '' : c); search(query, c === 'All' ? '' : c); }}
                    style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '500', background: (c === 'All' && !category) || category === c ? '#111827' : '#f9fafb', borderColor: (c === 'All' && !category) || category === c ? '#111827' : '#e5e7eb', color: (c === 'All' && !category) || category === c ? '#fff' : '#6b7280', transition: 'all 0.12s' }}>
                    {c}
                  </button>
                ))}
              </div>
              <button onClick={aiAnalyze} disabled={aiLoading || !query.trim()}
                style={{ padding: '8px 18px', background: aiLoading || !query.trim() ? '#9ca3af' : 'linear-gradient(135deg,#6c63ff,#a855f7)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: aiLoading || !query.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {aiLoading && <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
                {aiLoading ? 'Analyzing...' : '🤖 AI Analyze'}
              </button>
            </div>
            <button onClick={() => setShowContext(v => !v)} style={{ background: 'none', border: 'none', color: '#6c63ff', fontSize: '12px', cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit' }}>
              {showContext ? '▼' : '▶'} Add context (optional)
            </button>
            {showContext && (
              <textarea value={context} onChange={e => setContext(e.target.value)} rows={2}
                placeholder="Additional context: which script, table, spoke, or what you were doing..."
                style={{ width: '100%', marginTop: '8px', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#374151' }} />
            )}
          </div>

          {/* AI Result */}
          {aiResult && (
            <div style={{ background: '#fff', border: '1px solid #c4b5fd', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 2px 8px rgba(108,99,255,0.1)' }}>
              <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg,#ede9fe,#f5f3ff)', borderBottom: '1px solid #c4b5fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🤖</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#6c63ff' }}>AI Analysis {aiResult.source === 'encyclopedia' ? '— Found in Encyclopedia' : '— Generated'}</span>
                </div>
                {aiResult.severity && <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: SEV_BG[aiResult.severity], color: SEV_COLORS[aiResult.severity], border: `1px solid ${SEV_COLORS[aiResult.severity]}30` }}>{aiResult.severity?.toUpperCase()}</span>}
              </div>
              <div style={{ padding: '18px 20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>{aiResult.title}</h3>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', marginBottom: '14px' }}>{aiResult.description}</p>
                <div style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', marginBottom: '4px' }}>🔍 Root Cause</p>
                  <p style={{ fontSize: '13px', color: '#78350f', lineHeight: '1.6', margin: 0 }}>{aiResult.root_cause}</p>
                </div>
                {aiResult.fix_steps?.length > 0 && (
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fix Steps</p>
                    {aiResult.fix_steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'flex-start' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#6c63ff', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                        <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: 0, flex: 1 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                )}
                {aiResult.prevention && (
                  <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginTop: '12px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#15803d', marginBottom: '3px' }}>💡 Prevention</p>
                    <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>{aiResult.prevention}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DB Results */}
          {loading && <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>Searching encyclopedia...</div>}
          {!loading && results.map(err => (
            <div key={err.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => setExpanded(expanded === err.id ? null : err.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', margin: 0 }}>{err.title}</h3>
                      {err.verified && <span style={{ fontSize: '10px', padding: '1px 6px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '20px', fontWeight: '600' }}>✓ Verified</span>}
                      <span style={{ fontSize: '10px', padding: '1px 6px', background: SEV_BG[err.severity] || '#f9fafb', color: SEV_COLORS[err.severity] || '#374151', border: `1px solid ${SEV_COLORS[err.severity] || '#e5e7eb'}30`, borderRadius: '20px', fontWeight: '600' }}>{err.severity}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>{err.description?.substring(0, 120)}...</p>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '16px', marginLeft: '12px' }}>{expanded === err.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expanded === err.id && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 18px' }}>
                  <div style={{ padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '14px' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', marginBottom: '3px', textTransform: 'uppercase' }}>Root Cause</p>
                    <p style={{ fontSize: '13px', color: '#78350f', margin: 0, lineHeight: '1.6' }}>{err.root_cause}</p>
                  </div>
                  {Array.isArray(err.fix_steps) && err.fix_steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#6c63ff', color: '#fff', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>{i + 1}</div>
                      <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: '1.6' }}>{step}</p>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
                    <button onClick={() => markHelpful(err.id)} style={{ padding: '4px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#16a34a', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
                      👍 Helpful ({err.helpful_count || 0})
                    </button>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {err.tags?.slice(0,4).map(t => <span key={t} style={{ fontSize: '10px', padding: '2px 7px', background: '#f3f4f6', borderRadius: '20px', color: '#6b7280' }}>{t}</span>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {!loading && query.trim() && results.length === 0 && !aiResult && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
              <p style={{ fontSize: '15px', color: '#374151', fontWeight: '500', marginBottom: '8px' }}>Not in encyclopedia yet</p>
              <p style={{ fontSize: '13px', marginBottom: '16px' }}>Click "AI Analyze" to get an instant AI-powered explanation and fix</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
