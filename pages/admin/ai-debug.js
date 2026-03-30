import { useState } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

const CONTEXT_TYPES = [
  { value: 'general', label: '🧠 General', desc: 'Ask anything about the system' },
  { value: 'errors', label: '🔴 Errors', desc: 'Analyze recent error logs' },
  { value: 'performance', label: '⚡ Performance', desc: 'Analyze slow APIs' },
  { value: 'db', label: '🗄️ Database', desc: 'DB table analysis' },
];

const QUICK_PROMPTS = [
  'Why might search be returning empty results?',
  'How can I optimize the slowest API endpoints?',
  'Write a SQL query to find users who searched more than 10 times today',
  'What could cause Redis cache misses to be high?',
  'How do I add a new system property that controls the homepage banner?',
  'Write a migration SQL to add a phone column to sn_users',
  'Explain what the feature flag system does and how to use it',
];

function AIDebug() {
  const [question, setQuestion] = useState('');
  const [contextType, setContextType] = useState('general');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true); setError(''); setAnswer(null);
    try {
      const res = await axios.post('/api/admin/ai-debug', { question, context_type: contextType });
      const entry = { question, answer: res.data.answer, model: res.data.model, context: contextType, ts: new Date() };
      setAnswer(res.data);
      setHistory(h => [entry, ...h].slice(0, 10));
      setQuestion('');
    } catch (err) {
      setError(err.response?.data?.error || 'AI debug failed');
    } finally { setLoading(false); }
  };

  return (
    <>
      <Head><title>AI Debug Assistant — snspokes Admin</title></Head>
      <AdminLayout title="AI Debug Assistant" breadcrumbs={['System', 'AI Debug']}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

          {/* Main */}
          <div>
            {/* Context selector */}
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Context</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CONTEXT_TYPES.map(c => (
                  <button key={c.value} onClick={() => setContextType(c.value)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', background: contextType === c.value ? '#6c63ff' : '#0d0d1a', borderColor: contextType === c.value ? '#6c63ff' : '#1e1e2e', color: contextType === c.value ? '#fff' : '#9999bb', transition: 'all 0.15s' }} title={c.desc}>
                    {c.label}
                  </button>
                ))}
              </div>
              {contextType !== 'general' && (
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                  {CONTEXT_TYPES.find(c => c.value === contextType)?.desc}
                </p>
              )}
            </div>

            {/* Input */}
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask anything about your system — debug errors, optimize queries, generate code..." rows={4}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAsk(); }}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #1e1e2e', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: '#e2e8f0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>⌘+Enter to send</span>
                <button onClick={handleAsk} disabled={loading || !question.trim()} style={{ padding: '8px 20px', background: loading || !question.trim() ? '#4b5563' : '#6c63ff', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: loading || !question.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {loading && <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
                  {loading ? 'Thinking...' : '🤖 Ask AI'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && <div style={{ padding: '12px 16px', background: '#2d0a0a', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>⚠️ {error}</div>}

            {/* Answer */}
            {answer && (
              <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#0d0d1a', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🤖</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>AI Response</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{answer.model}</span>
                </div>
                <div style={{ padding: '16px', fontSize: '14px', color: '#9999bb', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                  {answer.answer}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Quick prompts + History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2e' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#9999bb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Prompts</p>
              </div>
              <div style={{ padding: '8px' }}>
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => setQuestion(p)} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#6b6b8a', cursor: 'pointer', fontFamily: 'inherit', lineHeight: '1.5', transition: 'all 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#0d0d1a'; e.currentTarget.style.color = '#e2e8f0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280'; }}
                  >{p}</button>
                ))}
              </div>
            </div>

            {history.length > 0 && (
              <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#9999bb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>History</p>
                  <button onClick={() => setHistory([])} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#9ca3af', cursor: 'pointer' }}>Clear</button>
                </div>
                <div style={{ padding: '8px' }}>
                  {history.map((h, i) => (
                    <button key={i} onClick={() => { setQuestion(h.question); setContextType(h.context); setAnswer({ answer: h.answer, model: h.model }); }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#6b6b8a', cursor: 'pointer', fontFamily: 'inherit', lineHeight: '1.5', transition: 'all 0.1s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#0d0d1a'; e.currentTarget.style.color = '#e2e8f0'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280'; }}
                    >💬 {h.question}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    </>
  );
}


export default withAdminPage(AIDebug);

export const getServerSideProps = async () => ({ props: {} });
