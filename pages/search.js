import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/* ─── Session ID (anonymous persistence) ─── */
function getSession() {
  if (typeof window === 'undefined') return '';
  let s = localStorage.getItem('sn_session');
  if (!s) { s = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('sn_session', s); }
  return s;
}

/* ─── Track activity ─── */
function track(event_type, data = {}) {
  fetch('/api/activity', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action:'track', session: getSession(), event_type, ...data })
  }).catch(() => {});
}

/* ─── Context options ─── */
const CONTEXTS = [
  { id:'',              label:'SN Developer',  icon:'⚙️' },
  { id:'beginner',      label:'Beginner',      icon:'🌱' },
  { id:'jira-admin',    label:'Jira Admin',    icon:'🔷' },
  { id:'python-dev',    label:'Python Dev',    icon:'🐍' },
  { id:'salesforce-admin', label:'Salesforce', icon:'☁️' },
  { id:'slack-admin',   label:'Slack Admin',   icon:'💬' },
];

const INTENT_META = {
  error:   { label:'Error Fix',     color:'#f87171', icon:'🐛' },
  compare: { label:'Decision Guide',color:'#f59e0b', icon:'⚖️' },
  code:    { label:'Code',          color:'#4ade80', icon:'💻' },
  explain: { label:'Explanation',   color:'#8b85ff', icon:'📖' },
};

/* ─── Markdown renderer ─── */
function Md({ text }) {
  if (!text) return null;
  const html = text
    .replace(/```(\w*)\n?([\s\S]*?)```/g,(_, lang, code) =>
      `<div class="md-pre"><div class="md-pre-hdr"><span class="md-lang">${lang||'code'}</span><button class="md-cp" onclick="navigator.clipboard?.writeText(this.closest('.md-pre').querySelector('code').innerText).then(()=>{this.textContent='✓ copied';setTimeout(()=>this.textContent='copy',1500)})">copy</button></div><pre><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre></div>`)
    .replace(/`([^`\n]+)`/g,'<code class="md-ic">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/^## (.+)$/gm,'<div class="md-h2">$1</div>')
    .replace(/^### (.+)$/gm,'<div class="md-h3">$1</div>')
    .replace(/^- (.+)$/gm,'<div class="md-li">▸ $1</div>')
    .replace(/\n\n/g,'<div class="md-gap"></div>');
  return (
    <>
      <style>{`
        .md-pre{background:#020208;border:1px solid #1a1a2e;border-radius:8px;margin:.6em 0;overflow:hidden}
        .md-pre-hdr{display:flex;justify-content:space-between;align-items:center;padding:5px 12px;background:#0a0a14;border-bottom:1px solid #1a1a2e}
        .md-lang{font-family:'JetBrains Mono',monospace;font-size:9px;color:#6c63ff;text-transform:uppercase;letter-spacing:1px}
        .md-cp{background:none;border:1px solid #1a1a2e;border-radius:4px;color:#6b7280;font-size:9px;padding:2px 8px;cursor:pointer;font-family:'JetBrains Mono',monospace}
        .md-cp:hover{color:#8b85ff;border-color:#6c63ff}
        .md-pre pre{margin:0;padding:12px 14px;overflow-x:auto}
        .md-pre code{font-family:'JetBrains Mono',monospace;font-size:12px;color:#7dd3fc;line-height:1.7}
        .md-ic{background:rgba(108,99,255,.1);border:1px solid rgba(108,99,255,.2);border-radius:4px;padding:1px 5px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#c4beff}
        .md-h2{color:#f0f4ff;font-size:14px;font-weight:700;margin:.8em 0 .35em;font-family:'Bricolage Grotesque',sans-serif}
        .md-h3{color:#e2e8f0;font-size:13px;font-weight:600;margin:.6em 0 .25em}
        .md-li{color:#b0b8d0;font-size:13.5px;margin:.2em 0;line-height:1.65;padding-left:4px}
        .md-gap{height:.5em}
        strong{color:#e8eaf6}
      `}</style>
      <div style={{ color:'#b0b8d0', fontSize:'13.5px', lineHeight:1.7 }}
           dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}

/* ─── Skeleton loader ─── */
function Skeleton({ h='14px', w='100%', mb='0', radius='6px' }) {
  return (
    <div style={{ height:h, width:w, background:'linear-gradient(90deg,#0d0d18 25%,#12121f 50%,#0d0d18 75%)',
      backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', borderRadius:radius, marginBottom:mb }} />
  );
}

/* ─── DB Answer renderer ─── */
function DBAnswer({ answer, onSave, saved }) {
  if (!answer) return null;
  const mono = { fontFamily:"'JetBrains Mono',monospace" };
  const pill = (text, color='#6c63ff') => (
    <span style={{ ...mono, fontSize:'9px', padding:'2px 8px', borderRadius:'4px',
      color, background:color+'14', border:`1px solid ${color}28` }}>{text}</span>
  );

  return (
    <div style={{ borderRadius:'14px', border:'1px solid rgba(74,222,128,.18)',
      background:'rgba(74,222,128,.02)', overflow:'hidden', marginBottom:'20px' }}>
      {/* Header */}
      <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(74,222,128,.08)',
        display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
        <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80',
          animation:'blink 2s infinite', flexShrink:0 }} />
        <span style={{ ...mono, fontSize:'9px', color:'#4ade80', letterSpacing:'1.5px' }}>FROM_DATABASE</span>
        <span style={{ ...mono, fontSize:'11px', color:'#e2e8f0', fontWeight:600 }}>{answer.name}</span>
        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', marginLeft:'auto' }}>
          {answer.global_var  && pill(answer.global_var,  '#f59e0b')}
          {answer.scope && answer.scope !== 'both' && pill(answer.scope, '#8b85ff')}
          {answer.tier        && pill(answer.tier,        '#0ea5e9')}
        </div>
        <button onClick={onSave}
          style={{ ...mono, background:'none', border:`1px solid ${saved ? '#4ade80' : '#1a1a2e'}`,
            borderRadius:'6px', color: saved ? '#4ade80' : '#374151', fontSize:'9px',
            padding:'3px 10px', cursor:'pointer', flexShrink:0, transition:'all .15s' }}>
          {saved ? '✓ saved' : '+ save'}
        </button>
      </div>

      <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>
        {answer.sections?.map((s, i) => {
          if (s.type === 'overview' && s.content) return (
            <p key={i} style={{ color:'#9ca3af', fontSize:'13.5px', lineHeight:1.7, margin:0 }}>{s.content}</p>
          );
          if (s.type === 'gotcha') return (
            <div key={i} style={{ padding:'10px 14px', background:'rgba(245,158,11,.06)',
              border:'1px solid rgba(245,158,11,.15)', borderRadius:'8px' }}>
              <div style={{ ...mono, fontSize:'9px', color:'#f59e0b', marginBottom:'5px', letterSpacing:'1px' }}>⚠ GOTCHA</div>
              <p style={{ color:'#d97706', fontSize:'13px', lineHeight:1.6, margin:0 }}>{s.content}</p>
            </div>
          );
          if (s.type === 'tip') return (
            <div key={i} style={{ padding:'10px 14px', background:'rgba(16,185,129,.05)',
              border:'1px solid rgba(16,185,129,.12)', borderRadius:'8px' }}>
              <div style={{ ...mono, fontSize:'9px', color:'#10b981', marginBottom:'5px', letterSpacing:'1px' }}>💡 TIP</div>
              <p style={{ color:'#6ee7b7', fontSize:'13px', lineHeight:1.6, margin:0 }}>{s.content}</p>
            </div>
          );
          if (s.type === 'scope') return (
            <div key={i} style={{ padding:'10px 14px', background:'rgba(108,99,255,.05)',
              border:'1px solid rgba(108,99,255,.12)', borderRadius:'8px' }}>
              <div style={{ ...mono, fontSize:'9px', color:'#6c63ff', marginBottom:'5px', letterSpacing:'1px' }}>SCOPED vs GLOBAL</div>
              <p style={{ color:'#9ca3af', fontSize:'13px', lineHeight:1.6, margin:0 }}>{s.content}</p>
            </div>
          );
          if (s.type === 'setup' && s.items?.length) return (
            <div key={i}>
              <div style={{ ...mono, fontSize:'9px', color:'#374151', marginBottom:'8px', letterSpacing:'1px', textTransform:'uppercase' }}>Setup Steps</div>
              {s.items.map((step, j) => (
                <div key={j} style={{ display:'flex', gap:'10px', padding:'5px 0', borderBottom:'1px solid #080810' }}>
                  <span style={{ ...mono, fontSize:'10px', color:'#4ade80', flexShrink:0, minWidth:'16px' }}>{j+1}.</span>
                  <span style={{ color:'#9ca3af', fontSize:'13px', lineHeight:1.5 }}>{step}</span>
                </div>
              ))}
            </div>
          );
          if (s.type === 'errors' && s.items?.length) return (
            <div key={i}>
              <div style={{ ...mono, fontSize:'9px', color:'#374151', marginBottom:'8px', letterSpacing:'1px', textTransform:'uppercase' }}>Common Errors</div>
              {s.items.map((err, j) => {
                const e = typeof err === 'string' ? { error: err, fix: '' } : err;
                return (
                  <div key={j} style={{ padding:'8px 10px', background:'rgba(248,113,113,.04)',
                    border:'1px solid rgba(248,113,113,.1)', borderRadius:'7px', marginBottom:'5px' }}>
                    <div style={{ ...mono, fontSize:'11px', color:'#f87171' }}>✗ {e.error}</div>
                    {e.fix && <div style={{ ...mono, fontSize:'11px', color:'#4ade80', marginTop:'4px' }}>✓ {e.fix}</div>}
                  </div>
                );
              })}
            </div>
          );
          if (s.type === 'actions' && s.items?.length) return (
            <div key={i}>
              <div style={{ ...mono, fontSize:'9px', color:'#374151', marginBottom:'8px', letterSpacing:'1px', textTransform:'uppercase' }}>Actions ({s.items.length})</div>
              <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                {s.items.slice(0,14).map((a, j) => {
                  const name = typeof a === 'string' ? a : a.name;
                  return <span key={j} style={{ ...mono, fontSize:'10px', padding:'3px 8px',
                    background:'rgba(108,99,255,.07)', border:'1px solid rgba(108,99,255,.13)',
                    borderRadius:'5px', color:'#8b85ff' }}>{name}</span>;
                })}
                {s.items.length > 14 && <span style={{ ...mono, fontSize:'10px', color:'#2a2a3a' }}>+{s.items.length-14} more</span>}
              </div>
            </div>
          );
          if (s.type === 'methods' && s.items?.length) return (
            <div key={i}>
              <div style={{ ...mono, fontSize:'9px', color:'#374151', marginBottom:'8px', letterSpacing:'1px', textTransform:'uppercase' }}>
                Methods ({s.total || s.items.length})
              </div>
              {s.items.slice(0,7).map((m, j) => (
                <div key={j} style={{ padding:'7px 10px', background:'rgba(255,255,255,.015)',
                  border:'1px solid rgba(255,255,255,.03)', borderRadius:'7px', marginBottom:'4px' }}>
                  <code style={{ ...mono, fontSize:'11px', color:'#8b85ff' }}>{m.name || m.path}</code>
                  {(m.desc || m.description) && <p style={{ color:'#6b7280', fontSize:'12px', margin:'3px 0 0', lineHeight:1.4 }}>{m.desc || m.description}</p>}
                </div>
              ))}
              {s.items.length > 7 && <Link href="/api-reference" style={{ ...mono, fontSize:'9px', color:'#374151', textDecoration:'none' }}>View all in API Reference →</Link>}
            </div>
          );
          if (s.type === 'best_practices' && s.items?.length) return (
            <div key={i}>
              <div style={{ ...mono, fontSize:'9px', color:'#374151', marginBottom:'8px', letterSpacing:'1px', textTransform:'uppercase' }}>Best Practices</div>
              {s.items.map((b, j) => (
                <div key={j} style={{ display:'flex', gap:'8px', padding:'4px 0', borderBottom:'1px solid #080810' }}>
                  <span style={{ color:'#4ade80', flexShrink:0 }}>✓</span>
                  <span style={{ color:'#6b7280', fontSize:'12.5px', lineHeight:1.5 }}>{b}</span>
                </div>
              ))}
            </div>
          );
          if (s.type === 'when' && s.content) return (
            <div key={i} style={{ padding:'8px 12px', background:'rgba(255,255,255,.015)',
              border:'1px solid rgba(255,255,255,.03)', borderRadius:'7px' }}>
              <div style={{ ...mono, fontSize:'9px', color:'#374151', marginBottom:'5px', letterSpacing:'1px' }}>WHEN IT RUNS</div>
              <p style={{ color:'#9ca3af', fontSize:'13px', margin:0, lineHeight:1.5 }}>{s.content}</p>
            </div>
          );
          if (s.type === 'code' && s.content) return (
            <div key={i}>
              <div style={{ ...mono, fontSize:'9px', color:'#374151', marginBottom:'7px', letterSpacing:'1px', textTransform:'uppercase' }}>Code Example</div>
              <div style={{ background:'#020208', border:'1px solid #0d0d18', borderRadius:'8px', overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 12px',
                  background:'#0a0a14', borderBottom:'1px solid #0d0d18' }}>
                  <span style={{ ...mono, fontSize:'9px', color:'#6c63ff', letterSpacing:'1px' }}>JAVASCRIPT</span>
                  <button onClick={() => navigator.clipboard?.writeText(s.content)}
                    style={{ ...mono, background:'none', border:'1px solid #1a1a2e', borderRadius:'3px',
                      color:'#6b7280', fontSize:'9px', padding:'1px 7px', cursor:'pointer' }}>copy</button>
                </div>
                <pre style={{ margin:0, padding:'12px 14px', overflowX:'auto' }}>
                  <code style={{ ...mono, fontSize:'11.5px', color:'#7dd3fc', lineHeight:1.7 }}>{s.content}</code>
                </pre>
              </div>
            </div>
          );
          if (s.type === 'meta') return (
            <div key={i} style={{ display:'flex', gap:'12px', flexWrap:'wrap', paddingTop:'4px', borderTop:'1px solid #080810' }}>
              {s.plugin_id        && <span style={{ ...mono, fontSize:'9px', color:'#1e1e2e' }}>plugin: {s.plugin_id}</span>}
              {s.credential_type  && <span style={{ ...mono, fontSize:'9px', color:'#1e1e2e' }}>auth: {s.credential_type}</span>}
              {s.min_version      && <span style={{ ...mono, fontSize:'9px', color:'#1e1e2e' }}>min: {s.min_version}</span>}
            </div>
          );
          return null;
        })}
      </div>
    </div>
  );
}

/* ─── Spoke card ─── */
function SpokeCard({ spoke, query: q, onSave, saved, delay = 0 }) {
  const [hov, setHov] = useState(false);
  const score = Math.round((spoke.score || 0) * 100);

  return (
    <div style={{ borderRadius:'12px', border:`1px solid ${hov ? 'rgba(108,99,255,.3)' : 'rgba(255,255,255,.05)'}`,
      background: hov ? 'rgba(108,99,255,.05)' : 'rgba(255,255,255,.02)',
      padding:'14px 16px', cursor:'pointer', transition:'all .2s cubic-bezier(.22,1,.36,1)',
      transform: hov ? 'translateY(-2px)' : 'none',
      boxShadow: hov ? '0 8px 32px rgba(0,0,0,.4)' : 'none',
      animation:`fadeUp .4s ease ${delay}s both`, opacity:0 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
        <div style={{ width:'38px', height:'38px', borderRadius:'10px',
          background:'rgba(108,99,255,.1)', border:'1px solid rgba(108,99,255,.15)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
          {spoke.icon || '🔌'}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
            <Link href={`/spoke/${spoke.slug}`}
              onClick={() => track('view_spoke', { entity_slug: spoke.slug, query: q })}
              style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:'14px',
                color:'#e8eaf6', textDecoration:'none' }}>
              {spoke.name}
            </Link>
            {score > 0 && (
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#6c63ff',
                background:'rgba(108,99,255,.08)', padding:'1px 6px', borderRadius:'4px' }}>
                {score}% match
              </span>
            )}
            {spoke.category && (
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#374151',
                background:'rgba(255,255,255,.03)', padding:'1px 6px', borderRadius:'4px' }}>
                {spoke.category}
              </span>
            )}
          </div>
          <p style={{ color:'#6b7280', fontSize:'12.5px', lineHeight:1.5, margin:0,
            overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box',
            WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {spoke.description || spoke.ai_description || ''}
          </p>
        </div>
        <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
          <button onClick={() => onSave(spoke)}
            style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
              background:'none', border:`1px solid ${saved ? '#4ade80' : '#1a1a2e'}`,
              color: saved ? '#4ade80' : '#374151', padding:'3px 8px', borderRadius:'5px',
              cursor:'pointer', transition:'all .15s' }}>
            {saved ? '✓' : '+'}
          </button>
          <Link href={`/spoke/${spoke.slug}`}
            style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
              background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.15)',
              color:'#8b85ff', padding:'3px 8px', borderRadius:'5px', textDecoration:'none',
              display:'inline-block', transition:'all .15s' }}>
            view →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function Search() {
  const router   = useRouter();
  const { data: session } = useSession();
  const [q, setQ]               = useState('');
  const [ctx, setCtx]           = useState('');
  const [results, setResults]   = useState([]);
  const [apiHits, setApiHits]   = useState([]);
  const [dbAnswer, setDbAnswer] = useState(null);
  const [aiAnswer, setAiAnswer] = useState('');
  const [intent, setIntent]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [latency, setLatency]   = useState(null);
  const [answerSource, setAnswerSource] = useState(null);
  const [searched, setSearched] = useState(false);
  const [logs, setLogs]         = useState([]);

  // Suggestions / dropdown
  const [suggestions, setSuggestions]   = useState([]);
  const [trending, setTrending]         = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropFocus, setDropFocus]       = useState(-1);

  // Saved items
  const [savedItems, setSavedItems]   = useState([]);
  const [savedSet, setSavedSet]       = useState(new Set());

  // Share state
  const [shareMsg, setShareMsg] = useState('');

  const inputRef = useRef(null);
  const dropRef  = useRef(null);
  const mono     = { fontFamily:"'JetBrains Mono',monospace" };

  const addLog = useCallback((type, text) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
    setLogs(prev => [...prev.slice(-40), { type, text, time }]);
  }, []);

  // Load context + saved on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCtx(localStorage.getItem('sn_intent') || '');

    // Load recent searches
    fetch(`/api/activity?action=history&session=${getSession()}`)
      .then(r => r.json())
      .then(d => setRecentSearches(d.history || []))
      .catch(() => {});

    // Load saved items
    fetch(`/api/activity?action=saved&session=${getSession()}`)
      .then(r => r.json())
      .then(d => {
        setSavedItems(d.saved || []);
        setSavedSet(new Set((d.saved || []).map(s => s.entity_slug)));
      })
      .catch(() => {});

    // Load trending
    fetch('/api/search?trending=1')
      .then(r => r.json())
      .then(d => setTrending(d.trending || []))
      .catch(() => {});
  }, []);

  // Prefill from URL
  useEffect(() => {
    const urlQ   = router.query.q || '';
    const urlCtx = router.query.ctx || '';
    if (urlQ) {
      setQ(urlQ);
      if (urlCtx) setCtx(urlCtx);
      doSearch(urlQ, urlCtx);
    }
  }, [router.query.q, router.query.ctx]);

  // Autocomplete suggestions
  useEffect(() => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/search?suggest=1&q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => setSuggestions(d.suggestions || []))
        .catch(() => {});
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Keyboard navigation in dropdown
  useEffect(() => {
    const items = suggestions.length > 0 ? suggestions : trending;
    const h = (e) => {
      if (!showDropdown) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setDropFocus(f => Math.min(f+1, items.length-1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setDropFocus(f => Math.max(f-1, -1)); }
      if (e.key === 'Enter' && dropFocus >= 0) {
        e.preventDefault();
        const item = items[dropFocus];
        pickSuggestion(item.name || item.query || item);
      }
      if (e.key === 'Escape') setShowDropdown(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showDropdown, dropFocus, suggestions, trending]);

  const doSearch = async (searchQ, searchCtx) => {
    const sq = (searchQ || q).trim();
    if (!sq) return;
    setLoading(true); setSearched(true); setResults([]); setApiHits([]);
    setDbAnswer(null); setAiAnswer(''); setAnswerSource(null); setLatency(null);
    setShowDropdown(false); setDropFocus(-1);

    addLog('search', `query: "${sq}"`);
    addLog('info',   'searching database...');

    const t0 = Date.now();
    try {
      const r = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: sq, context: searchCtx || ctx, session_id: getSession() }),
      });
      const d = await r.json();
      const ms = Date.now() - t0;
      setLatency(ms);

      if (d.db_answer)  { setDbAnswer(d.db_answer);  addLog('success', `DB answer: ${d.db_answer.name}`); }
      if (d.results)    { setResults(d.results);     addLog('success', `${d.results.length} spoke matches`); }
      if (d.api_results){ setApiHits(d.api_results); }
      if (d.ai_answer)  { setAiAnswer(d.ai_answer);  addLog('ai',  `AI answer (${d.ai_model || 'AI'})`); }
      if (d.intent)     { setIntent(d.intent); }
      setAnswerSource(d.answer_source);

      if (!d.db_answer && !d.ai_answer && d.results.length === 0) {
        addLog('error', 'no results — try different keywords');
      }
      addLog('system', `done in ${ms}ms`);
    } catch (err) {
      addLog('error', err.message);
    }
    setLoading(false);
  };

  const pickSuggestion = (s) => {
    const name = typeof s === 'string' ? s : s.name || s.query || '';
    setQ(name); setSuggestions([]); setShowDropdown(false);
    doSearch(name, ctx);
  };

  const saveItem = async (spoke) => {
    const s = getSession();
    const isSaved = savedSet.has(spoke.slug);
    if (isSaved) {
      await fetch('/api/activity', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'unsave', session:s, entity_type:'spoke', entity_slug:spoke.slug }) });
      setSavedSet(prev => { const n = new Set(prev); n.delete(spoke.slug); return n; });
    } else {
      await fetch('/api/activity', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'save', session:s, entity_type:'spoke', entity_slug:spoke.slug,
          title: spoke.name, description: spoke.description }) });
      setSavedSet(prev => new Set([...prev, spoke.slug]));
    }
  };

  const saveDbAnswer = async () => {
    if (!dbAnswer) return;
    const slug = dbAnswer.slug;
    const isSaved = savedSet.has(slug);
    if (!isSaved) {
      await fetch('/api/activity', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'save', session:getSession(), entity_type: dbAnswer.type,
          entity_slug: slug, title: dbAnswer.name }) });
      setSavedSet(prev => new Set([...prev, slug]));
    }
  };

  const share = () => {
    const url = `${window.location.origin}/search?q=${encodeURIComponent(q)}`;
    navigator.clipboard?.writeText(url);
    setShareMsg('Link copied!');
    setTimeout(() => setShareMsg(''), 2000);
    track('share', { query: q });
  };

  const currentCtx = CONTEXTS.find(c => c.id === ctx);
  const intentMeta = INTENT_META[intent];
  const hasResults = searched && (results.length > 0 || apiHits.length > 0 || dbAnswer || aiAnswer);
  const noResults  = searched && !loading && !hasResults;

  return (
    <>
      <Head>
        <title>{q ? `${q} — snspokes` : 'Search — snspokes'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes blink   { 0%,100%{opacity:1}50%{opacity:0} }
          @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
          @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }
          @keyframes pulse   { 0%,100%{opacity:1}50%{opacity:.4} }
          @keyframes slideIn { from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)} }

          body { background:#040407; }
          * { box-sizing: border-box; }

          .search-wrap:focus-within { border-color:rgba(108,99,255,.5)!important; box-shadow:0 0 0 4px rgba(108,99,255,.1),0 16px 48px rgba(0,0,0,.5)!important; }
          .sugg-item:hover,.sugg-item.active { background:rgba(108,99,255,.08)!important; }
          .result-link:hover { color:#a78bfa!important; }
          .copy-btn:hover { background:rgba(108,99,255,.1)!important; border-color:rgba(108,99,255,.3)!important; }
        `}</style>
      </Head>
      <Navbar />

      <main style={{ background:'#040407', minHeight:'100vh', color:'#e8eaf6',
        fontFamily:"'DM Sans',sans-serif", padding:'0' }}>

        {/* ══ SEARCH BAR ══ */}
        <div style={{ background:'rgba(4,4,7,.95)', backdropFilter:'blur(20px)',
          borderBottom:'1px solid rgba(255,255,255,.04)', padding:'72px 24px 24px',
          position:'sticky', top:0, zIndex:200 }}>
          <div style={{ maxWidth:'820px', margin:'0 auto' }}>

            {/* Context selector */}
            <div style={{ display:'flex', gap:'6px', marginBottom:'12px', overflowX:'auto',
              paddingBottom:'4px', scrollbarWidth:'none' }}>
              {CONTEXTS.map(c => (
                <button key={c.id} onClick={() => setCtx(c.id)}
                  style={{ ...mono, fontSize:'10px', padding:'4px 12px', borderRadius:'20px', whiteSpace:'nowrap',
                    background: ctx === c.id ? 'rgba(108,99,255,.15)' : 'rgba(255,255,255,.03)',
                    border: ctx === c.id ? '1px solid rgba(108,99,255,.4)' : '1px solid rgba(255,255,255,.06)',
                    color: ctx === c.id ? '#8b85ff' : '#4b5563', cursor:'pointer', transition:'all .15s',
                    flexShrink:0 }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div ref={dropRef} style={{ position:'relative' }}>
              <div className="search-wrap" style={{ display:'flex', alignItems:'center', gap:'8px',
                padding:'6px', background:'rgba(255,255,255,.04)', borderRadius:'14px',
                border:'1px solid rgba(255,255,255,.08)', boxShadow:'0 4px 24px rgba(0,0,0,.4)',
                transition:'border-color .2s, box-shadow .2s' }}>
                <div style={{ padding:'0 6px 0 10px', flexShrink:0 }}>
                  {loading
                    ? <div style={{ width:'14px', height:'14px', border:'2px solid rgba(108,99,255,.3)',
                        borderTopColor:'#6c63ff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                    : <svg width="14" height="14" fill="none" stroke="#4b5563" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  }
                </div>

                <input ref={inputRef} value={q}
                  onChange={e => { setQ(e.target.value); setShowDropdown(true); setDropFocus(-1); }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={e => { if (e.key === 'Enter' && dropFocus < 0) doSearch(); }}
                  placeholder="Search spokes, APIs, errors, code patterns…"
                  style={{ flex:1, background:'none', border:'none', outline:'none',
                    color:'#e8eaf6', fontSize:'15px', fontFamily:"'DM Sans',sans-serif",
                    padding:'10px 4px', minWidth:0 }} />

                {q && (
                  <button onClick={() => { setQ(''); setSuggestions([]); inputRef.current?.focus(); }}
                    style={{ ...mono, background:'none', border:'none', color:'#374151',
                      fontSize:'16px', cursor:'pointer', padding:'0 4px', flexShrink:0, lineHeight:1 }}>×</button>
                )}

                {intentMeta && searched && (
                  <span style={{ ...mono, fontSize:'9px', padding:'3px 8px',
                    background:`${intentMeta.color}14`, border:`1px solid ${intentMeta.color}28`,
                    color:intentMeta.color, borderRadius:'5px', flexShrink:0, whiteSpace:'nowrap' }}>
                    {intentMeta.icon} {intentMeta.label}
                  </span>
                )}

                <button onClick={() => doSearch()}
                  style={{ flexShrink:0, padding:'10px 20px',
                    background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none',
                    borderRadius:'10px', color:'#fff', fontSize:'13.5px', fontWeight:700,
                    cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap',
                    transition:'opacity .15s' }}>
                  Search
                </button>
              </div>

              {/* ── Dropdown ── */}
              {showDropdown && (q.trim().length < 2 || suggestions.length > 0 || trending.length > 0 || recentSearches.length > 0) && (
                <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0,
                  background:'#06060e', border:'1px solid rgba(255,255,255,.07)',
                  borderRadius:'14px', overflow:'hidden', zIndex:500,
                  boxShadow:'0 24px 64px rgba(0,0,0,.7)', animation:'fadeUp .15s ease' }}>

                  {/* Suggestions from DB */}
                  {suggestions.length > 0 && (
                    <div style={{ padding:'8px' }}>
                      <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', padding:'4px 10px 6px', letterSpacing:'1.5px' }}>SUGGESTIONS</div>
                      {suggestions.slice(0,5).map((s, i) => (
                        <button key={i} onClick={() => pickSuggestion(s)}
                          className={`sugg-item${dropFocus===i?' active':''}`}
                          style={{ display:'flex', alignItems:'center', gap:'10px', width:'100%',
                            padding:'8px 10px', background:'transparent', border:'none',
                            cursor:'pointer', textAlign:'left', borderRadius:'8px', transition:'background .1s' }}>
                          <span style={{ fontSize:'16px', flexShrink:0 }}>{s.icon || '🔍'}</span>
                          <span style={{ color:'#e2e8f0', fontSize:'13.5px', fontFamily:"'DM Sans',sans-serif" }}>{s.name}</span>
                          <span style={{ marginLeft:'auto', ...mono, fontSize:'9px', color:'#1e1e2e',
                            background:'rgba(255,255,255,.03)', padding:'1px 6px', borderRadius:'4px' }}>{s.type}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recent searches */}
                  {q.trim().length < 2 && recentSearches.length > 0 && (
                    <div style={{ padding:'8px', borderTop: suggestions.length ? '1px solid #0d0d18' : 'none' }}>
                      <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', padding:'4px 10px 6px', letterSpacing:'1.5px' }}>RECENT</div>
                      {recentSearches.slice(0,4).map((s, i) => (
                        <button key={i} onClick={() => pickSuggestion(s.query)}
                          className="sugg-item"
                          style={{ display:'flex', alignItems:'center', gap:'10px', width:'100%',
                            padding:'7px 10px', background:'transparent', border:'none',
                            cursor:'pointer', textAlign:'left', borderRadius:'8px', transition:'background .1s' }}>
                          <span style={{ ...mono, fontSize:'11px', color:'#2a2a3a' }}>↺</span>
                          <span style={{ color:'#6b7280', fontSize:'13px', fontFamily:"'DM Sans',sans-serif" }}>{s.query}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Trending */}
                  {q.trim().length < 2 && trending.length > 0 && (
                    <div style={{ padding:'8px', borderTop:'1px solid #0d0d18' }}>
                      <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', padding:'4px 10px 6px', letterSpacing:'1.5px' }}>🔥 TRENDING TODAY</div>
                      {trending.slice(0,5).map((t, i) => (
                        <button key={i} onClick={() => pickSuggestion(t.query)}
                          className="sugg-item"
                          style={{ display:'flex', alignItems:'center', gap:'10px', width:'100%',
                            padding:'7px 10px', background:'transparent', border:'none',
                            cursor:'pointer', textAlign:'left', borderRadius:'8px', transition:'background .1s' }}>
                          <span style={{ ...mono, fontSize:'11px', color:'#6c63ff', minWidth:'18px' }}>#{i+1}</span>
                          <span style={{ color:'#9ca3af', fontSize:'13px', fontFamily:"'DM Sans',sans-serif" }}>{t.query}</span>
                          <span style={{ marginLeft:'auto', ...mono, fontSize:'9px', color:'#1e1e2e' }}>{t.count}×</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick examples */}
                  <div style={{ padding:'8px 12px 10px', borderTop:'1px solid #0d0d18',
                    display:'flex', gap:'6px', flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ ...mono, fontSize:'9px', color:'#1e1e2e' }}>try:</span>
                    {['Slack OAuth error','GlideRecord insert','REST API auth','Business Rule script'].map(ex => (
                      <button key={ex} onClick={() => pickSuggestion(ex)}
                        style={{ ...mono, padding:'3px 10px', background:'rgba(108,99,255,.06)',
                          border:'1px solid rgba(108,99,255,.12)', borderRadius:'20px',
                          color:'#6b7280', fontSize:'10px', cursor:'pointer', transition:'all .15s' }}>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ BODY ══ */}
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'24px', display:'grid',
          gridTemplateColumns:'1fr 280px', gap:'20px', alignItems:'start' }}>

          {/* ─ LEFT: Results ─ */}
          <div>

            {/* Loading skeletons */}
            {loading && (
              <div style={{ display:'flex', flexDirection:'column', gap:'12px', animation:'fadeUp .3s ease' }}>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                {/* DB answer skeleton */}
                <div style={{ borderRadius:'14px', border:'1px solid rgba(74,222,128,.1)', padding:'16px', background:'rgba(74,222,128,.02)' }}>
                  <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
                    <Skeleton h="8px" w="60px" />
                    <Skeleton h="8px" w="100px" />
                  </div>
                  <Skeleton h="14px" w="90%" mb="8px" />
                  <Skeleton h="14px" w="75%" mb="16px" />
                  <Skeleton h="80px" w="100%" radius="8px" />
                </div>
                {[0,1,2].map(i => (
                  <div key={i} style={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,.04)',
                    padding:'14px 16px', display:'flex', gap:'12px' }}>
                    <Skeleton h="38px" w="38px" radius="10px" />
                    <div style={{ flex:1 }}>
                      <Skeleton h="14px" w="40%" mb="8px" />
                      <Skeleton h="12px" w="80%" mb="4px" />
                      <Skeleton h="12px" w="65%" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DB Answer */}
            {!loading && dbAnswer && (
              <DBAnswer answer={dbAnswer} onSave={saveDbAnswer} saved={savedSet.has(dbAnswer.slug)} />
            )}

            {/* AI Answer */}
            {!loading && aiAnswer && (
              <div style={{ borderRadius:'14px', border:'1px solid rgba(139,133,255,.18)',
                background:'rgba(108,99,255,.03)', overflow:'hidden', marginBottom:'20px' }}>
                <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(139,133,255,.08)',
                  display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ ...mono, fontSize:'9px', color:'#8b85ff', letterSpacing:'1.5px' }}>⟡ AI_ANSWER</span>
                  <span style={{ ...mono, fontSize:'9px', color:'#2a2a3a' }}>— AI fallback (no DB match)</span>
                </div>
                <div style={{ padding:'16px' }}><Md text={aiAnswer} /></div>
              </div>
            )}

            {/* Spoke results */}
            {!loading && results.length > 0 && (
              <div style={{ marginBottom:'20px' }}>
                {(dbAnswer || aiAnswer) && (
                  <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', marginBottom:'10px', letterSpacing:'1.5px' }}>
                    RELATED_SPOKES ({results.length})
                  </div>
                )}
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {results.map((s, i) => (
                    <SpokeCard key={s.slug} spoke={s} query={q} delay={i * 0.04}
                      onSave={saveItem} saved={savedSet.has(s.slug)} />
                  ))}
                </div>
              </div>
            )}

            {/* API results */}
            {!loading && apiHits.length > 0 && (
              <div style={{ marginBottom:'20px' }}>
                <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', marginBottom:'10px', letterSpacing:'1.5px' }}>
                  API_REFERENCE ({apiHits.length})
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {apiHits.map((a, i) => (
                    <div key={a.slug} style={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,.05)',
                      background:'rgba(255,255,255,.02)', padding:'12px 16px',
                      animation:`fadeUp .4s ease ${i*.04}s both`, opacity:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                        <span style={{ fontSize:'14px' }}>📡</span>
                        <Link href="/api-reference"
                          style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700,
                            fontSize:'13.5px', color:'#e2e8f0', textDecoration:'none' }}>
                          {a.name}
                        </Link>
                        <span style={{ ...mono, fontSize:'9px', color:'#0ea5e9',
                          background:'rgba(14,165,233,.08)', border:'1px solid rgba(14,165,233,.15)',
                          padding:'1px 6px', borderRadius:'4px' }}>{a.api_type}</span>
                      </div>
                      <p style={{ color:'#6b7280', fontSize:'12.5px', lineHeight:1.5, margin:0 }}>{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {noResults && (
              <div style={{ textAlign:'center', padding:'60px 24px', animation:'fadeUp .3s ease' }}>
                <div style={{ fontSize:'40px', marginBottom:'16px' }}>🔍</div>
                <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'20px', fontWeight:700,
                  color:'#e2e8f0', marginBottom:'8px' }}>No results for "{q}"</h3>
                <p style={{ color:'#4b5563', fontSize:'13.5px', marginBottom:'24px' }}>
                  We've logged this gap. Try different keywords or ask AI.
                </p>
                <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
                  {['Slack spoke','GlideRecord','REST API','Business Rule'].map(eg => (
                    <button key={eg} onClick={() => { setQ(eg); doSearch(eg, ctx); }}
                      style={{ ...mono, padding:'6px 14px', background:'rgba(108,99,255,.08)',
                        border:'1px solid rgba(108,99,255,.15)', borderRadius:'8px',
                        color:'#8b85ff', fontSize:'11px', cursor:'pointer' }}>
                      {eg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!searched && !loading && (
              <div style={{ padding:'32px 0' }}>
                <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', marginBottom:'16px', letterSpacing:'1.5px' }}>
                  🔥 TRENDING TODAY
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  {(trending.length > 0 ? trending : [
                    { query:'Slack spoke setup' }, { query:'GlideRecord query examples' },
                    { query:'REST API authentication ServiceNow' }, { query:'Business Rule best practices' },
                    { query:'ACL denied error fix' },
                  ]).slice(0,6).map((t, i) => (
                    <button key={i} onClick={() => { setQ(t.query); doSearch(t.query, ctx); }}
                      style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px',
                        background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)',
                        borderRadius:'10px', cursor:'pointer', textAlign:'left', transition:'all .15s',
                        animation:`slideIn .4s ease ${i*.05}s both`, opacity:0 }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(108,99,255,.06)'; e.currentTarget.style.borderColor='rgba(108,99,255,.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.02)'; e.currentTarget.style.borderColor='rgba(255,255,255,.05)'; }}>
                      <span style={{ ...mono, fontSize:'12px', color:'#6c63ff', minWidth:'20px' }}>#{i+1}</span>
                      <span style={{ color:'#9ca3af', fontSize:'13.5px', fontFamily:"'DM Sans',sans-serif" }}>{t.query}</span>
                      {t.count && <span style={{ marginLeft:'auto', ...mono, fontSize:'9px', color:'#1e1e2e' }}>{t.count}×</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─ RIGHT: Sidebar ─ */}
          <div style={{ position:'sticky', top:'180px', display:'flex', flexDirection:'column', gap:'14px' }}>

            {/* Search meta */}
            {searched && !loading && (
              <div style={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,.05)',
                background:'rgba(255,255,255,.02)', padding:'12px 14px',
                animation:'fadeUp .3s ease' }}>
                <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', marginBottom:'10px', letterSpacing:'1.5px' }}>SEARCH_META</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  {latency && <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ ...mono, fontSize:'10px', color:'#374151' }}>latency</span>
                    <span style={{ ...mono, fontSize:'10px', color:'#4ade80' }}>{latency}ms</span>
                  </div>}
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ ...mono, fontSize:'10px', color:'#374151' }}>source</span>
                    <span style={{ ...mono, fontSize:'10px', color:'#8b85ff' }}>{answerSource || 'none'}</span>
                  </div>
                  {intentMeta && <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ ...mono, fontSize:'10px', color:'#374151' }}>intent</span>
                    <span style={{ ...mono, fontSize:'10px', color: intentMeta.color }}>{intentMeta.icon} {intentMeta.label}</span>
                  </div>}
                  {results.length > 0 && <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ ...mono, fontSize:'10px', color:'#374151' }}>matches</span>
                    <span style={{ ...mono, fontSize:'10px', color:'#f0f4ff' }}>{results.length + apiHits.length}</span>
                  </div>}
                </div>
                <button onClick={share}
                  style={{ marginTop:'12px', width:'100%', ...mono, fontSize:'10px',
                    padding:'7px', background:'rgba(108,99,255,.07)', border:'1px solid rgba(108,99,255,.15)',
                    borderRadius:'7px', color: shareMsg ? '#4ade80' : '#8b85ff', cursor:'pointer', transition:'all .15s' }}>
                  {shareMsg || '🔗 share results'}
                </button>
              </div>
            )}

            {/* Terminal log */}
            <div style={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,.04)',
              background:'rgba(255,255,255,.015)', overflow:'hidden' }}>
              <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,.04)',
                display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: loading ? '#f59e0b' : searched ? '#4ade80' : '#1e1e2e',
                  animation: loading ? 'pulse 1s infinite' : 'none' }} />
                <span style={{ ...mono, fontSize:'9px', color:'#1e1e2e', letterSpacing:'1.5px' }}>TERMINAL</span>
              </div>
              <div style={{ padding:'10px 12px', height:'140px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'1px' }}>
                {logs.length === 0
                  ? <span style={{ ...mono, fontSize:'10px', color:'#1e1e2e' }}>Waiting for query…</span>
                  : logs.map((l, i) => {
                    const c = { info:'#4b5563', success:'#4ade80', error:'#f87171', ai:'#8b85ff', search:'#f59e0b', system:'#1e1e2e' };
                    const ic = { info:'›', success:'✓', error:'✗', ai:'⟡', search:'⌕', system:'◈' };
                    return (
                      <div key={i} style={{ display:'flex', gap:'6px', fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', lineHeight:1.6 }}>
                        <span style={{ color:'#1e1e2e', flexShrink:0 }}>{l.time}</span>
                        <span style={{ color:c[l.type]||'#4b5563', flexShrink:0 }}>{ic[l.type]||'›'}</span>
                        <span style={{ color:l.type==='system'?'#2a2a3a':'#6b7280', wordBreak:'break-all' }}>{l.text}</span>
                      </div>
                    );
                  })
                }
              </div>
            </div>

            {/* Saved items */}
            {savedItems.length > 0 && (
              <div style={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,.05)',
                background:'rgba(255,255,255,.02)', padding:'12px 14px' }}>
                <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', marginBottom:'10px', letterSpacing:'1.5px' }}>
                  📌 SAVED ({savedItems.length})
                </div>
                {savedItems.slice(0,5).map((item, i) => (
                  <div key={i} style={{ padding:'5px 0', borderBottom:'1px solid #080810' }}>
                    <Link href={`/spoke/${item.entity_slug}`}
                      style={{ color:'#6b7280', fontSize:'12px', textDecoration:'none',
                        fontFamily:"'DM Sans',sans-serif", transition:'color .1s' }}
                      className="result-link">
                      {item.title}
                    </Link>
                  </div>
                ))}
                {savedItems.length > 5 && (
                  <div style={{ ...mono, fontSize:'9px', color:'#374151', marginTop:'8px' }}>+{savedItems.length-5} more in dashboard</div>
                )}
              </div>
            )}

            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div style={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,.05)',
                background:'rgba(255,255,255,.02)', padding:'12px 14px' }}>
                <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', marginBottom:'10px', letterSpacing:'1.5px' }}>↺ CONTINUE</div>
                {recentSearches.slice(0,5).map((s, i) => (
                  <button key={i} onClick={() => { setQ(s.query); doSearch(s.query, ctx); }}
                    style={{ display:'block', width:'100%', padding:'5px 0', background:'none', border:'none',
                      borderBottom:'1px solid #080810', color:'#6b7280', fontSize:'12px', cursor:'pointer',
                      textAlign:'left', fontFamily:"'DM Sans',sans-serif', transition:'color .1s'",
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {s.query}
                  </button>
                ))}
              </div>
            )}

            {/* Quick links */}
            <div style={{ borderRadius:'12px', border:'1px solid rgba(255,255,255,.04)',
              background:'rgba(255,255,255,.015)', padding:'12px 14px' }}>
              <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', marginBottom:'10px', letterSpacing:'1.5px' }}>QUICK_LINKS</div>
              {[
                { href:'/api-reference', label:'API Reference', icon:'📡' },
                { href:'/spokes', label:'All Spokes', icon:'🔌' },
                { href:'/tools/cheatsheet', label:'Cheatsheet', icon:'📖' },
                { href:'/tools/code-generator', label:'Code Generator', icon:'💻' },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 0',
                    borderBottom:'1px solid #080810', color:'#4b5563', fontSize:'12px',
                    textDecoration:'none', fontFamily:"'DM Sans',sans-serif", transition:'color .1s' }}
                  className="result-link">
                  <span style={{ fontSize:'13px' }}>{l.icon}</span>{l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
