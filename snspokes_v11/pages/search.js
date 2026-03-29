import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';
import { useSession } from 'next-auth/react';

export default function Search() {
  const router = useRouter();
  const { q } = router.query;
  const { data: session } = useSession();

  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState([]);
  const [aiAnswer, setAiAnswer] = useState(null);
  const [streamedText, setStreamedText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offTopic, setOffTopic] = useState(false);
  const [searched, setSearched] = useState(false);
  const [meta, setMeta] = useState({});

  useEffect(() => {
    if (q) { setQueryText(q); doSearch(q); }
  }, [q]);

  const doSearch = async (searchQuery) => {
    if (!searchQuery?.trim()) return;
    setLoading(true); setError(''); setSearched(true);
    setResults([]); setAiAnswer(null); setStreamedText(''); setOffTopic(false);
    const start = Date.now();

    try {
      const res = await axios.post('/api/search', {
        query: searchQuery.trim(),
        user_id: session?.user?.id || null,
      }, { timeout: 15000 });

      if (res.data.success) {
        setResults(res.data.results || []);
        setAiAnswer(res.data.ai_answer);
        setMeta({ cached: res.data.cached, model: res.data.model, latency: res.data.latency_ms || (Date.now() - start) });
      } else if (res.data.is_off_topic) {
        setOffTopic(true);
      } else {
        setError(res.data.error || 'Search failed');
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError(`Rate limit exceeded. Please wait ${err.response.data.retry_after || 60} seconds.`);
      } else if (err.response?.status === 400 && err.response.data?.is_off_topic) {
        setOffTopic(true);
      } else {
        setError('Search service unavailable. Please try again.');
      }
    } finally { setLoading(false); }
  };

  const doStream = async () => {
    if (!queryText.trim() || streaming) return;
    setStreaming(true); setStreamedText(''); setError(''); setAiAnswer(null);
    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText.trim(), user_id: session?.user?.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.is_off_topic) setOffTopic(true);
        else setError(err.error || 'Stream failed');
        setStreaming(false); return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') setStreamedText(p => p + data.content);
            if (data.type === 'done') setMeta(m => ({ ...m, model: data.model }));
            if (data.type === 'error') setError(data.message);
          } catch {}
        }
      }
    } catch { setError('Streaming failed. Please try again.'); }
    finally { setStreaming(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    router.push(`/search?q=${encodeURIComponent(queryText.trim())}`, undefined, { shallow: true });
    doSearch(queryText);
  };

  const iStyle = { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '16px', fontFamily: 'Syne, sans-serif', padding: '8px 0' };

  return (
    <>
      <Head>
        <title>{q ? `"${q}" — snspokes` : 'Search — snspokes'}</title>
        <meta name="description" content="Search ServiceNow Integration Hub spokes" />
      </Head>
      <Navbar />
      <main style={{ paddingTop: '100px', minHeight: '100vh' }}>

        {/* Search Bar */}
        <section style={{ padding: '40px 24px 32px', borderBottom: '1px solid #1e1e2e' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <form onSubmit={handleSearch}>
              <div style={{ display: 'flex', gap: '12px', padding: '8px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '16px', transition: 'border-color 0.2s' }}
                onFocusCapture={e => e.currentTarget.style.borderColor = '#6c63ff'}
                onBlurCapture={e => e.currentTarget.style.borderColor = '#1e1e2e'}
              >
                <span style={{ paddingLeft: '12px', display: 'flex', alignItems: 'center', fontSize: '20px' }}>🔍</span>
                <input type="text" value={queryText} onChange={e => setQueryText(e.target.value)} placeholder="Search ServiceNow spokes, scripts, APIs..." autoFocus style={iStyle} />
                <button type="button" onClick={doStream} disabled={streaming || !queryText.trim()} title="Stream AI response"
                  style={{ padding: '10px 16px', background: streaming ? '#1e1e2e' : 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', color: '#a855f7', fontSize: '13px', cursor: streaming ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' }}>
                  {streaming ? '⏳' : '⚡ Stream'}
                </button>
                <button type="submit" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' }}>Search</button>
              </div>
            </form>

            {/* Meta info */}
            {meta.latency && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#6b6b8a' }}>⏱ {meta.latency}ms</span>
                {meta.cached && <span style={{ fontSize: '12px', color: '#4ade80' }}>⚡ Cached</span>}
                {meta.model && <span style={{ fontSize: '12px', color: '#6b6b8a' }}>🤖 {meta.model}</span>}
              </div>
            )}
          </div>
        </section>

        {/* Results */}
        <section style={{ padding: '32px 24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #1e1e2e', borderTopColor: '#6c63ff', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#6b6b8a' }}>Searching across database and AI...</p>
              </div>
            )}

            {/* Off Topic */}
            {offTopic && !loading && (
              <div style={{ padding: '24px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
                <h3 style={{ color: '#fbbf24', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>ServiceNow Queries Only</h3>
                <p style={{ color: '#9999bb', fontSize: '14px', marginBottom: '16px' }}>This platform is specifically designed for ServiceNow Integration Hub spokes, scripts, and configurations.</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['How to setup Slack spoke?', 'GlideRecord addQuery example', 'Business rule not firing', 'OAuth spoke setup'].map(s => (
                    <button key={s} onClick={() => { setQueryText(s); router.push(`/search?q=${encodeURIComponent(s)}`); doSearch(s); }}
                      style={{ padding: '6px 12px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', color: '#8b85ff', fontSize: '12px', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#f87171', marginBottom: '24px' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Streamed Response */}
            {(streamedText || streaming) && (
              <div style={{ padding: '24px', background: '#0f0f1a', borderRadius: '16px', border: '1px solid rgba(168,85,247,0.3)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '16px' }}>⚡</span>
                  <h3 style={{ color: '#a855f7', fontSize: '15px', fontWeight: '700' }}>Live AI Response</h3>
                  {streaming && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', animation: 'pulse 0.8s infinite' }} />}
                </div>
                <p style={{ color: '#c4c4e0', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                  {streamedText}
                  {streaming && <span style={{ borderLeft: '2px solid #a855f7', marginLeft: '2px', animation: 'blink 1s infinite' }}>&nbsp;</span>}
                </p>
              </div>
            )}

            {/* AI Answer */}
            {aiAnswer && !aiAnswer.error && !loading && (
              <div style={{ padding: '24px', background: '#0f0f1a', borderRadius: '16px', border: '1px solid rgba(108,99,255,0.3)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '16px' }}>🤖</span>
                  <h3 style={{ color: '#8b85ff', fontSize: '15px', fontWeight: '700' }}>AI Answer</h3>
                  {aiAnswer.confidence && <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '20px', color: '#4ade80' }}>{Math.round(aiAnswer.confidence * 100)}% confident</span>}
                  {meta.cached && <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', color: '#8b85ff' }}>⚡ Cached</span>}
                </div>
                <p style={{ color: '#c4c4e0', fontSize: '14px', lineHeight: '1.8', marginBottom: aiAnswer.code_example ? '16px' : 0 }}>{aiAnswer.answer}</p>
                {aiAnswer.code_example && (
                  <pre style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '14px', fontSize: '13px', overflow: 'auto', color: '#a8b2d8', margin: '12px 0' }}>{aiAnswer.code_example}</pre>
                )}
                {aiAnswer.key_points && aiAnswer.key_points.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ color: '#6b6b8a', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>KEY POINTS</p>
                    {aiAnswer.key_points.map((pt, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ color: '#6c63ff', flexShrink: 0 }}>→</span>
                        <span style={{ color: '#9999bb', fontSize: '13px' }}>{pt}</span>
                      </div>
                    ))}
                  </div>
                )}
                {aiAnswer.manager_explanation && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(108,99,255,0.05)', borderRadius: '10px', border: '1px solid rgba(108,99,255,0.15)' }}>
                    <p style={{ color: '#6b6b8a', fontSize: '11px', fontWeight: '600', marginBottom: '6px' }}>📋 MANAGER SUMMARY</p>
                    <p style={{ color: '#9999bb', fontSize: '13px' }}>{aiAnswer.manager_explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* DB Results - Matching Spokes */}
            {!loading && results.length > 0 && (
              <>
                <p style={{ color: '#6b6b8a', fontSize: '14px', marginBottom: '16px' }}>
                  Found <span style={{ color: '#fff', fontWeight: '600' }}>{results.length}</span> matching spoke{results.length !== 1 ? 's' : ''}
                </p>
                {results.map((spoke, i) => (
                  <Link key={spoke.slug || i} href={`/spoke/${spoke.slug}`} style={{ textDecoration: 'none' }}>
                    <div className="card-hover" style={{ padding: '20px', borderRadius: '16px', background: '#0f0f1a', marginBottom: '12px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{spoke.icon || '🔌'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>{spoke.name}</h3>
                            {spoke.plugin_id && <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#6b6b8a', background: '#0a0a14', padding: '2px 6px', borderRadius: '4px', border: '1px solid #1e1e2e' }}>{spoke.plugin_id}</code>}
                            {spoke.category && <span style={{ padding: '2px 8px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '10px', fontSize: '11px', color: '#8b85ff' }}>{spoke.category}</span>}
                          </div>
                          <p style={{ color: '#9999bb', fontSize: '13px', lineHeight: '1.5' }}>{spoke.description}</p>
                        </div>
                        <span style={{ color: '#6c63ff', fontSize: '18px' }}>→</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            )}

            {/* Empty */}
            {!loading && searched && results.length === 0 && !aiAnswer && !offTopic && !error && !streamedText && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>No spokes found</h3>
                <p style={{ color: '#6b6b8a' }}>Try a different search term or browse all spokes</p>
              </div>
            )}

            {/* Initial state */}
            {!searched && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔌</div>
                <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>ServiceNow AI Search</h3>
                <p style={{ color: '#6b6b8a', marginBottom: '24px' }}>Powered by Redis caching + AI for instant results</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {['Slack spoke setup', 'GlideRecord examples', 'OAuth configuration', 'Business Rule tips', 'Flow Designer guide'].map(s => (
                    <button key={s} onClick={() => { setQueryText(s); router.push(`/search?q=${encodeURIComponent(s)}`); doSearch(s); }}
                      style={{ padding: '8px 16px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', color: '#8b85ff', fontSize: '13px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(108,99,255,0.08)'}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .card-hover { transition: all 0.2s; border: 1px solid #1e1e2e; }
        .card-hover:hover { border-color: #6c63ff; box-shadow: 0 0 20px rgba(108,99,255,0.1); transform: translateY(-1px); }
      `}</style>
    </>
  );
}
