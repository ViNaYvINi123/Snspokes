import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';

const TYPE_META = {
  rest:    { label:'REST API',     color:'#0ea5e9', icon:'🌐', desc:'Inbound HTTP endpoints your apps call' },
  server:  { label:'Server-Side',  color:'#6c63ff', icon:'⚙️', desc:'JavaScript running on the ServiceNow platform' },
  client:  { label:'Client-Side',  color:'#f59e0b', icon:'🖥️', desc:'JavaScript running in the browser' },
  context: { label:'Script Context',color:'#10b981', icon:'📜', desc:'Where and how scripts run' },
};

const SCOPE_META = {
  both:          { label:'Scoped + Global', color:'#4b5563' },
  scoped_only:   { label:'Scoped Only',     color:'#8b85ff' },
  global_only:   { label:'Global Only',     color:'#f59e0b' },
  client_only:   { label:'Client Only',     color:'#0ea5e9' },
  service_portal:{ label:'Service Portal',  color:'#10b981' },
};

function Tag({ text, color = '#4b5563' }) {
  return (
    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', fontWeight:600,
      color, background: color + '15', border:`1px solid ${color}25`,
      padding:'2px 7px', borderRadius:'4px', whiteSpace:'nowrap' }}>
      {text}
    </span>
  );
}

function APICard({ api, onClick }) {
  const tm = TYPE_META[api.api_type] || TYPE_META.server;
  const sm = SCOPE_META[api.scope] || SCOPE_META.both;
  return (
    <div onClick={() => onClick(api)}
      style={{ padding:'14px 16px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)',
        borderRadius:'10px', cursor:'pointer', transition:'all .15s', position:'relative', overflow:'hidden' }}
      onMouseOver={e => { e.currentTarget.style.borderColor = tm.color + '40'; e.currentTarget.style.background = tm.color + '08'; }}
      onMouseOut={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)'; e.currentTarget.style.background = 'rgba(255,255,255,.02)'; }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'1.5px', background:`linear-gradient(to right,transparent,${tm.color}60,transparent)` }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px', marginBottom:'6px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'7px', flex:1, minWidth:0 }}>
          <span style={{ fontSize:'14px', flexShrink:0 }}>{tm.icon}</span>
          <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{api.name}</span>
          {api.global_var && (
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:tm.color, flexShrink:0 }}>{api.global_var}</span>
          )}
        </div>
        <div style={{ display:'flex', gap:'4px', flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <Tag text={tm.label} color={tm.color} />
          <Tag text={sm.label} color={sm.color} />
        </div>
      </div>
      <p style={{ color:'#6b7280', fontSize:'12px', lineHeight:1.5, margin:'0 0 8px' }}>
        {(api.description || '').slice(0, 100)}{(api.description || '').length > 100 ? '…' : ''}
      </p>
      {api.gotcha && (
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#f59e0b',
          background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.15)',
          borderRadius:'5px', padding:'4px 8px' }}>
          ⚠ {api.gotcha.slice(0, 90)}{api.gotcha.length > 90 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

function DetailPanel({ api, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!api) return null;
  const tm = TYPE_META[api.api_type] || TYPE_META.server;
  const sm = SCOPE_META[api.scope] || SCOPE_META.both;
  const methods = typeof api.methods === 'string' ? JSON.parse(api.methods) : (api.methods || []);
  const params  = typeof api.params  === 'string' ? JSON.parse(api.params)  : (api.params  || []);
  const auth    = typeof api.auth    === 'string' ? JSON.parse(api.auth)    : (api.auth    || []);
  const types   = typeof api.types   === 'string' ? JSON.parse(api.types)   : (api.types   || []);
  const best    = typeof api.best_practices === 'string' ? JSON.parse(api.best_practices) : (api.best_practices || []);
  const avars   = typeof api.available_vars === 'string' ? JSON.parse(api.available_vars) : (api.available_vars || []);

  const copy = () => {
    navigator.clipboard?.writeText(api.code_example || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{ height:'100%', overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'#1a1a2e transparent' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #0d0d18', position:'sticky', top:0, background:'#06060e', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'18px' }}>{tm.icon}</span>
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'16px', fontWeight:700, color:'#f0f4ff', margin:0 }}>{api.name}</h2>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:'18px', lineHeight:1, padding:'2px 6px' }}>×</button>
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          <Tag text={tm.label}  color={tm.color} />
          <Tag text={sm.label}  color={sm.color} />
          {api.global_var && <Tag text={api.global_var} color={tm.color} />}
          {api.base_path  && <Tag text={api.base_path}  color='#374151' />}
        </div>
      </div>

      <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:'18px' }}>

        {/* Description */}
        <p style={{ color:'#9ca3af', fontSize:'13.5px', lineHeight:1.7, margin:0 }}>{api.description}</p>

        {/* Gotcha */}
        {api.gotcha && (
          <div style={{ padding:'10px 14px', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.2)', borderRadius:'8px' }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#f59e0b', marginBottom:'5px', letterSpacing:'1px' }}>⚠ GOTCHA</div>
            <p style={{ color:'#d97706', fontSize:'13px', lineHeight:1.6, margin:0 }}>{api.gotcha}</p>
          </div>
        )}

        {/* Methods */}
        {methods.length > 0 && (
          <div>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>
              {api.api_type === 'rest' ? 'HTTP ENDPOINTS' : 'METHODS'}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {methods.map((m, i) => (
                <div key={i} style={{ padding:'10px 12px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'8px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                    {m.method && (
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', fontWeight:700, padding:'2px 7px', borderRadius:'4px',
                        color: m.method==='GET'?'#4ade80':m.method==='POST'?'#6c63ff':m.method==='DELETE'?'#f87171':'#f59e0b',
                        background: m.method==='GET'?'rgba(74,222,128,.1)':m.method==='POST'?'rgba(108,99,255,.1)':m.method==='DELETE'?'rgba(248,113,113,.1)':'rgba(245,158,11,.1)',
                      }}>{m.method}</span>
                    )}
                    <code style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#8b85ff' }}>
                      {m.path || m.name}
                    </code>
                  </div>
                  <p style={{ color:'#6b7280', fontSize:'12px', margin:0, lineHeight:1.5 }}>{m.desc || m.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Query Params */}
        {params.length > 0 && (
          <div>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>PARAMETERS</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
              {params.map((p, i) => (
                <div key={i} style={{ display:'flex', gap:'12px', padding:'7px 0', borderBottom:'1px solid #0d0d18' }}>
                  <code style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#6c63ff', minWidth:'160px', flexShrink:0 }}>{p.name}</code>
                  <span style={{ color:'#6b7280', fontSize:'12px', lineHeight:1.5 }}>{p.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available vars */}
        {avars.length > 0 && (
          <div>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>AVAILABLE VARIABLES</p>
            {avars.map((v, i) => (
              <div key={i} style={{ display:'flex', gap:'12px', padding:'7px 0', borderBottom:'1px solid #0d0d18' }}>
                <code style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#f59e0b', minWidth:'100px', flexShrink:0 }}>{v.var}</code>
                <span style={{ color:'#6b7280', fontSize:'12px' }}>{v.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Types */}
        {types.length > 0 && (
          <div>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>TYPES / SUBTYPES</p>
            {types.map((t, i) => (
              <div key={i} style={{ padding:'8px 12px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'7px', marginBottom:'5px' }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#8b85ff', fontWeight:600 }}>{t.type}</span>
                <p style={{ color:'#6b7280', fontSize:'12px', margin:'4px 0 0' }}>{t.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Auth */}
        {auth.length > 0 && (
          <div>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>AUTHENTICATION</p>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {auth.map((a, i) => <Tag key={i} text={a} color='#10b981' />)}
            </div>
          </div>
        )}

        {/* Scoped differences */}
        {api.scoped_differences && (
          <div style={{ padding:'10px 14px', background:'rgba(108,99,255,.06)', border:'1px solid rgba(108,99,255,.15)', borderRadius:'8px' }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#6c63ff', marginBottom:'5px', letterSpacing:'1px' }}>SCOPED vs GLOBAL</div>
            <p style={{ color:'#9ca3af', fontSize:'12.5px', margin:0, lineHeight:1.6 }}>{api.scoped_differences}</p>
          </div>
        )}

        {/* Best practices */}
        {best.length > 0 && (
          <div>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>BEST PRACTICES</p>
            {best.map((b, i) => (
              <div key={i} style={{ display:'flex', gap:'8px', padding:'5px 0', borderBottom:'1px solid #0d0d18' }}>
                <span style={{ color:'#4ade80', flexShrink:0 }}>✓</span>
                <span style={{ color:'#6b7280', fontSize:'12.5px', lineHeight:1.5 }}>{b}</span>
              </div>
            ))}
          </div>
        )}

        {/* Code example */}
        {api.code_example && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', textTransform:'uppercase', letterSpacing:'1px', margin:0 }}>CODE EXAMPLE</p>
              <button onClick={copy} style={{ padding:'3px 10px', background: copied ? 'rgba(74,222,128,.1)' : 'rgba(108,99,255,.08)', border:`1px solid ${copied ? 'rgba(74,222,128,.2)' : 'rgba(108,99,255,.15)'}`, borderRadius:'5px', color: copied ? '#4ade80' : '#8b85ff', fontSize:'10px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
                {copied ? '✓ copied' : 'copy'}
              </button>
            </div>
            <div style={{ background:'#020208', border:'1px solid #0d0d18', borderRadius:'10px', overflow:'hidden' }}>
              <pre style={{ margin:0, padding:'16px', overflowX:'auto', fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', color:'#7dd3fc', lineHeight:1.7 }}>
                <code>{api.code_example}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function APIReference() {
  const [results, setResults]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [q, setQ]               = useState('');
  const [typeF, setTypeF]       = useState('');
  const [scopeF, setScopeF]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [counts, setCounts]     = useState({});
  const inputRef = useRef(null);

  const search = async (query = q, type = typeF, scope = scopeF) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query, type, scope, limit: 60 });
      const r = await fetch(`/api/search-api?${params}`);
      const d = await r.json();
      setResults(d.results || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { search(); }, []);
  useEffect(() => {
    const t = setTimeout(() => search(), 250);
    return () => clearTimeout(t);
  }, [q, typeF, scopeF]);

  // Count by type
  useEffect(() => {
    const c = {};
    results.forEach(r => { c[r.api_type] = (c[r.api_type] || 0) + 1; });
    setCounts(c);
  }, [results]);

  const typeFilters = [
    { v:'',       l:'All',          count: results.length },
    { v:'rest',   l:'REST APIs',    count: counts.rest    || 0 },
    { v:'server', l:'Server-Side',  count: counts.server  || 0 },
    { v:'client', l:'Client-Side',  count: counts.client  || 0 },
    { v:'context',l:'Contexts',     count: counts.context || 0 },
  ];

  return (
    <>
      <Head>
        <title>ServiceNow API Reference — snspokes</title>
        <meta name="description" content="Complete ServiceNow API reference — REST APIs, Server-Side (GlideRecord, GlideSystem), Client-Side (g_form, g_user), Scoped vs Global differences." />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </Head>
      <Navbar />

      <div style={{ background:'#040407', minHeight:'100vh', paddingTop:'64px', fontFamily:"'DM Sans',sans-serif" }}>
        {/* Header */}
        <div style={{ borderBottom:'1px solid #0d0d18', padding:'28px 32px 20px' }}>
          <div style={{ maxWidth:'1400px', margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:'16px', marginBottom:'20px' }}>
              <div>
                <h1 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'26px', fontWeight:800, color:'#f0f4ff', margin:'0 0 5px', letterSpacing:'-.5px' }}>
                  ServiceNow API Reference
                </h1>
                <p style={{ color:'#374151', fontSize:'12px', fontFamily:"'JetBrains Mono',monospace", margin:0 }}>
                  REST APIs · Server-Side · Client-Side · Scoped vs Global
                </p>
              </div>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                    <span style={{ fontSize:'12px' }}>{v.icon}</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:v.color }}>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Search + filters */}
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:'260px', display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'9px', transition:'border-color .2s' }}
                onFocusCapture={e => e.currentTarget.style.borderColor = '#6c63ff'}
                onBlurCapture={e  => e.currentTarget.style.borderColor = '#1a1a2e'}>
                <svg width="13" height="13" fill="none" stroke="#374151" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                  placeholder="search APIs, methods, examples..."
                  style={{ flex:1, background:'none', border:'none', outline:'none', color:'#e8eaf6', fontSize:'13.5px', fontFamily:"'JetBrains Mono',monospace" }} />
                {loading && <div style={{ width:'13px', height:'13px', border:'1.5px solid #1e1e2e', borderTopColor:'#6c63ff', borderRadius:'50%', animation:'spin .6s linear infinite', flexShrink:0 }}/>}
              </div>

              <select value={scopeF} onChange={e => setScopeF(e.target.value)}
                style={{ padding:'8px 12px', background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'9px', color:'#9ca3af', fontSize:'12px', fontFamily:"'JetBrains Mono',monospace", outline:'none', cursor:'pointer' }}>
                <option value="">All Scopes</option>
                <option value="both">Scoped + Global</option>
                <option value="scoped_only">Scoped Only</option>
                <option value="global_only">Global Only</option>
                <option value="client_only">Client Only</option>
              </select>
            </div>

            {/* Type filter pills */}
            <div style={{ display:'flex', gap:'6px', marginTop:'14px', flexWrap:'wrap' }}>
              {typeFilters.map(f => (
                <button key={f.v} onClick={() => setTypeF(f.v)}
                  style={{ padding:'5px 14px', borderRadius:'20px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace", fontSize:'10.5px', border:'1px solid', transition:'all .15s',
                    background: typeF===f.v ? 'rgba(108,99,255,.15)' : 'transparent',
                    borderColor: typeF===f.v ? 'rgba(108,99,255,.4)' : '#1a1a2e',
                    color: typeF===f.v ? '#8b85ff' : '#4b5563' }}>
                  {f.l} {f.count > 0 && <span style={{ opacity:.6 }}>({f.count})</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Split layout */}
        <div style={{ maxWidth:'1400px', margin:'0 auto', display:'flex', gap:0, height:'calc(100vh - 220px)' }}>

          {/* Left — results list */}
          <div style={{ flex: selected ? '0 0 420px' : '1', overflowY:'auto', padding:'20px 24px', scrollbarWidth:'thin', scrollbarColor:'#1a1a2e transparent', borderRight: selected ? '1px solid #0d0d18' : 'none', transition:'flex .2s' }}>
            {results.length === 0 && !loading && (
              <div style={{ textAlign:'center', paddingTop:'60px' }}>
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#1e1e2e' }}>
                  {q ? 'NO_RESULTS' : 'RUN SYNC → /admin/sync to import API data'}
                </p>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {results.map(api => (
                <APICard key={api.slug} api={api}
                  onClick={a => setSelected(s => s?.slug === a.slug ? null : a)} />
              ))}
            </div>
          </div>

          {/* Right — detail panel */}
          {selected && (
            <div style={{ flex:1, background:'#06060e', borderLeft:'1px solid #0d0d18' }}>
              <DetailPanel api={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
