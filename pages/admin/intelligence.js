import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const mono = { fontFamily:"'JetBrains Mono',monospace" };

function StatCard({ label, value, sub, color='#6c63ff' }) {
  return (
    <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)',
      borderRadius:'12px', padding:'16px 18px' }}>
      <div style={{ ...mono, fontSize:'9px', color:'#374151', letterSpacing:'1.5px', marginBottom:'8px' }}>{label}</div>
      <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'28px', fontWeight:800, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ ...mono, fontSize:'9px', color:'#2a2a3a', marginTop:'6px' }}>{sub}</div>}
    </div>
  );
}

export default function AdminIntelligence() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setToken(localStorage.getItem('admin_token') || '');
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/intelligence', { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const sourceColors = { spoke_db:'#4ade80', api_db:'#0ea5e9', ai_fallback:'#f59e0b' };

  return (
    <>
      <Head>
        <title>Intelligence — snspokes Admin</title>
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <main style={{ background:'#040407', minHeight:'100vh', color:'#e8eaf6',
        fontFamily:"'DM Sans',sans-serif", padding:'0' }}>

        {/* Header */}
        <div style={{ background:'rgba(255,255,255,.02)', borderBottom:'1px solid rgba(255,255,255,.06)',
          padding:'18px 24px', display:'flex', alignItems:'center', gap:'16px' }}>
          <Link href="/admin" style={{ ...mono, fontSize:'10px', color:'#374151', textDecoration:'none' }}>← admin</Link>
          <span style={{ ...mono, fontSize:'9px', color:'#1e1e2e' }}>/</span>
          <span style={{ ...mono, fontSize:'10px', color:'#6c63ff', letterSpacing:'1px' }}>INTELLIGENCE</span>
          <div style={{ marginLeft:'auto', display:'flex', gap:'8px', alignItems:'center' }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80' }} />
            <span style={{ ...mono, fontSize:'9px', color:'#374151' }}>live data</span>
            <button onClick={() => window.location.reload()}
              style={{ ...mono, fontSize:'9px', padding:'4px 10px', background:'rgba(108,99,255,.1)',
                border:'1px solid rgba(108,99,255,.2)', borderRadius:'6px', color:'#8b85ff', cursor:'pointer' }}>
              refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding:'60px', textAlign:'center', ...mono, fontSize:'11px', color:'#374151' }}>Loading intelligence data…</div>
        ) : !data ? (
          <div style={{ padding:'60px', textAlign:'center', ...mono, fontSize:'11px', color:'#f87171' }}>Failed to load. Check admin token.</div>
        ) : (
          <div style={{ padding:'24px', maxWidth:'1200px', margin:'0 auto' }}>

            {/* Stats row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'10px', marginBottom:'24px' }}>
              <StatCard label="AVG LATENCY" value={`${data.latency?.avg_ms || 0}ms`} sub="last 24h" color="#4ade80" />
              <StatCard label="P95 LATENCY" value={`${data.latency?.p95_ms || 0}ms`} sub="last 24h" color="#f59e0b" />
              <StatCard label="SEARCH GAPS" value={data.search_gaps?.length || 0} sub="queries with no answer" color="#f87171" />
              <StatCard label="TOP SPOKE" value={data.top_spokes?.[0]?.name || '—'} sub={`${data.top_spokes?.[0]?.view_count || 0} views`} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>

              {/* Top searches */}
              <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:'14px', overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                  <span style={{ ...mono, fontSize:'9px', color:'#6c63ff', letterSpacing:'1.5px' }}>TOP SEARCHES — 7 DAYS</span>
                </div>
                <div style={{ padding:'8px' }}>
                  {(data.top_searches || []).slice(0,10).map((s, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px',
                      padding:'7px 10px', borderRadius:'8px', borderBottom:'1px solid rgba(255,255,255,.03)' }}>
                      <span style={{ ...mono, fontSize:'10px', color:'#1e1e2e', minWidth:'18px' }}>#{i+1}</span>
                      <span style={{ flex:1, color:'#9ca3af', fontSize:'13px',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.query}</span>
                      <span style={{ ...mono, fontSize:'9px', color:'#374151' }}>{s.count}×</span>
                      <span style={{ ...mono, fontSize:'9px',
                        color: s.success_rate > 70 ? '#4ade80' : s.success_rate > 30 ? '#f59e0b' : '#f87171' }}>
                        {Math.round(s.success_rate || 0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search gaps — what to build */}
              <div style={{ background:'rgba(248,113,113,.02)', border:'1px solid rgba(248,113,113,.12)', borderRadius:'14px', overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(248,113,113,.08)' }}>
                  <span style={{ ...mono, fontSize:'9px', color:'#f87171', letterSpacing:'1.5px' }}>⚠ SEARCH GAPS — BUILD THESE</span>
                </div>
                <div style={{ padding:'8px' }}>
                  {(data.search_gaps || []).slice(0,8).map((s, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px',
                      padding:'7px 10px', borderBottom:'1px solid rgba(255,255,255,.03)' }}>
                      <span style={{ ...mono, fontSize:'10px', color:'#f87171', minWidth:'18px' }}>{i+1}</span>
                      <span style={{ flex:1, color:'#9ca3af', fontSize:'13px',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.query}</span>
                      <span style={{ ...mono, fontSize:'9px', color:'#f87171' }}>{s.count}× failed</span>
                    </div>
                  ))}
                  {(!data.search_gaps || data.search_gaps.length === 0) && (
                    <div style={{ padding:'24px', textAlign:'center', ...mono, fontSize:'10px', color:'#374151' }}>
                      No gaps detected ✓
                    </div>
                  )}
                </div>
                <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(248,113,113,.08)',
                  ...mono, fontSize:'9px', color:'#2a2a3a' }}>
                  💡 Add these as spokes or API references to close gaps
                </div>
              </div>

              {/* Answer source breakdown */}
              <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:'14px', overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                  <span style={{ ...mono, fontSize:'9px', color:'#4ade80', letterSpacing:'1.5px' }}>ANSWER SOURCES — 7 DAYS</span>
                </div>
                <div style={{ padding:'16px' }}>
                  {(data.answer_sources || []).map((s, i) => {
                    const total = data.answer_sources.reduce((a, r) => a + parseInt(r.count), 0);
                    const pct   = Math.round(parseInt(s.count) / total * 100);
                    const color = sourceColors[s.answer_source] || '#374151';
                    return (
                      <div key={i} style={{ marginBottom:'12px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                          <span style={{ ...mono, fontSize:'10px', color }}>{s.answer_source}</span>
                          <span style={{ ...mono, fontSize:'10px', color:'#374151' }}>{s.count} ({pct}%)</span>
                        </div>
                        <div style={{ height:'4px', background:'rgba(255,255,255,.04)', borderRadius:'2px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:'2px',
                            transition:'width .5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                  {(!data.answer_sources || data.answer_sources.length === 0) && (
                    <div style={{ ...mono, fontSize:'10px', color:'#374151', textAlign:'center', padding:'16px' }}>No data yet</div>
                  )}
                </div>
              </div>

              {/* Top spokes by view */}
              <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:'14px', overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                  <span style={{ ...mono, fontSize:'9px', color:'#0ea5e9', letterSpacing:'1.5px' }}>TOP SPOKES BY VIEWS</span>
                </div>
                <div style={{ padding:'8px' }}>
                  {(data.top_spokes || []).slice(0,8).map((s, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px',
                      padding:'7px 10px', borderRadius:'8px', borderBottom:'1px solid rgba(255,255,255,.03)' }}>
                      <span style={{ ...mono, fontSize:'10px', color:'#1e1e2e', minWidth:'18px' }}>#{i+1}</span>
                      <span style={{ flex:1, color:'#9ca3af', fontSize:'13px' }}>{s.name}</span>
                      <span style={{ ...mono, fontSize:'9px', color:'#0ea5e9' }}>{s.view_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });
