export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CATEGORIES = ['All','Communication','DevOps','Cloud','Security','Monitoring','ITSM','ProjectMgmt','Storage','HR','Analytics'];

function SkeletonCard() {
  return (
    <div style={{ padding:'20px', borderRadius:'14px', background:'#0d0d18', border:'1px solid #1e1e2e', animation:'pulse 1.5s infinite' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
        <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'#1a1a2e' }} />
        <div style={{ flex:1 }}>
          <div style={{ width:'60%', height:'14px', background:'#1a1a2e', borderRadius:'4px', marginBottom:'6px' }} />
          <div style={{ width:'30%', height:'10px', background:'#1a1a2e', borderRadius:'4px' }} />
        </div>
      </div>
      <div style={{ width:'100%', height:'10px', background:'#1a1a2e', borderRadius:'4px', marginBottom:'6px' }} />
      <div style={{ width:'80%', height:'10px', background:'#1a1a2e', borderRadius:'4px' }} />
    </div>
  );
}

export default function SpokesPage() {
  const [spokes, setSpokes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    fetch('/api/spokes')
      .then(r => r.json())
      .then(d => { setSpokes(d.spokes || d.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = spokes.filter(s => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || s.category === category;
    return matchSearch && matchCat;
  });

  return (
    <>
      <Head>
        <title>Integration Hub Spokes — snspokes</title>
        <meta name="description" content="Browse 200+ ServiceNow Integration Hub spokes with setup guides, actions, and code examples." />
      </Head>
      <Navbar />
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .spoke-card { transition: all .2s cubic-bezier(.22,1,.36,1); cursor:pointer; }
        .spoke-card:hover { transform:translateY(-4px); border-color:rgba(108,99,255,.3)!important; box-shadow:0 16px 48px rgba(0,0,0,.4), 0 0 0 1px rgba(108,99,255,.15); }
      `}</style>
      <main style={{ paddingTop:'80px', minHeight:'100vh', background:'#040407', fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px 24px' }}>

          {/* Header */}
          <div style={{ marginBottom:'36px' }}>
            <h1 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'32px', fontWeight:800, color:'#f0f4ff', marginBottom:'8px' }}>
              Integration Hub Spokes
            </h1>
            <p style={{ color:'#6b7280', fontSize:'15px' }}>
              {loading ? 'Loading...' : `${filtered.length} spokes available`} — search, filter, and explore ServiceNow integrations
            </p>
          </div>

          {/* Search + Filter */}
          <div style={{ display:'flex', gap:'12px', marginBottom:'28px', flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:'240px', position:'relative' }}>
              <svg width="16" height="16" fill="none" stroke="#4b5563" strokeWidth="2" viewBox="0 0 24 24" style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search spokes..."
                style={{ width:'100%', padding:'12px 16px 12px 40px', background:'#0a0a14', border:'1px solid #1e1e2e', borderRadius:'12px', color:'#e8eaf6', fontSize:'14px', fontFamily:"'DM Sans',sans-serif", outline:'none' }} />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ padding:'12px 16px', background:'#0a0a14', border:'1px solid #1e1e2e', borderRadius:'12px', color:'#e8eaf6', fontSize:'13px', fontFamily:"'JetBrains Mono',monospace", outline:'none', cursor:'pointer' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Category chips */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'28px', flexWrap:'wrap' }}>
            {CATEGORIES.slice(0,8).map(c => (
              <button key={c} onClick={() => setCategory(c)}
                style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:500, cursor:'pointer', border:'1px solid', fontFamily:"'DM Sans',sans-serif", transition:'all .15s',
                  background: category===c ? 'rgba(108,99,255,.15)' : 'transparent',
                  borderColor: category===c ? 'rgba(108,99,255,.4)' : '#1e1e2e',
                  color: category===c ? '#8b85ff' : '#6b7280',
                }}>{c === 'All' ? `All (${spokes.length})` : c}</button>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
            {loading ? Array(8).fill(0).map((_,i) => <SkeletonCard key={i} />) :
              filtered.length === 0 ? (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 20px' }}>
                  <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔍</div>
                  <h3 style={{ color:'#e2e8f0', fontSize:'18px', fontWeight:700, marginBottom:'8px' }}>No spokes found</h3>
                  <p style={{ color:'#6b7280', fontSize:'14px' }}>Try a different search term or category</p>
                </div>
              ) :
              filtered.map(s => {
                const actionCount = (() => { try { const a = typeof s.actions === 'string' ? JSON.parse(s.actions) : s.actions; return Array.isArray(a) ? a.length : 0; } catch { return 0; } })();
                return (
                  <Link key={s.slug} href={`/spoke/${s.slug}`} style={{ textDecoration:'none' }}>
                    <div className="spoke-card" style={{ padding:'20px', borderRadius:'14px', background:'#0d0d18', border:'1px solid #1e1e2e', height:'100%' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                        <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(108,99,255,.1)', border:'1px solid rgba(108,99,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
                          {s.icon || '🔌'}
                        </div>
                        <div style={{ overflow:'hidden' }}>
                          <div style={{ color:'#e2e8f0', fontSize:'15px', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4b5563' }}>{s.category} {s.tier && s.tier !== 'professional' ? `· ${s.tier}` : ''}</div>
                        </div>
                      </div>
                      <p style={{ color:'#6b7280', fontSize:'13px', lineHeight:1.5, marginBottom:'12px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {s.description || 'Integration Hub spoke for ServiceNow'}
                      </p>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        {s.min_version && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#4ade80', background:'rgba(74,222,128,.08)', border:'1px solid rgba(74,222,128,.15)', padding:'2px 8px', borderRadius:'4px' }}>v{s.min_version}</span>}
                        {actionCount > 0 && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#8b85ff', background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.15)', padding:'2px 8px', borderRadius:'4px' }}>{actionCount} actions</span>}
                        {s.credential_type && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#f59e0b', background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.15)', padding:'2px 8px', borderRadius:'4px' }}>{s.credential_type}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })
            }
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
