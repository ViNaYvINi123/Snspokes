import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

/* ─── WHO ARE YOU? — the key differentiator ─── */
const CONTEXTS = [
  { id:'',              label:'SN Developer',    icon:'⚙️', desc:'I write ServiceNow code' },
  { id:'beginner',      label:'Beginner',         icon:'🌱', desc:'New to ServiceNow' },
  { id:'jira-admin',    label:'Jira Admin',       icon:'🔷', desc:'Integrating Jira ↔ ServiceNow' },
  { id:'python-dev',    label:'Python Dev',       icon:'🐍', desc:'Calling SN REST APIs' },
  { id:'salesforce-admin', label:'Salesforce',   icon:'☁️', desc:'Integrating Salesforce ↔ SN' },
  { id:'slack-admin',   label:'Slack Admin',      icon:'💬', desc:'Setting up Slack notifications' },
];

const INTENT_META = {
  error:   { label:'Error Fix',     color:'#f87171', icon:'🐛', desc:'Root cause + fix' },
  compare: { label:'Decision Guide',color:'#f59e0b', icon:'⚖️', desc:'When to use what' },
  code:    { label:'Code Example',  color:'#4ade80', icon:'💻', desc:'Copy-paste ready' },
  explain: { label:'Explanation',   color:'#8b85ff', icon:'📖', desc:'How + When + Why' },
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

/* ─── Terminal log line ─── */
function LogLine({ type, text, time }) {
  const c = { info:'#4b5563', success:'#4ade80', error:'#f87171', ai:'#8b85ff', search:'#f59e0b', system:'#1e1e2e' };
  const i = { info:'›', success:'✓', error:'✗', ai:'⟡', search:'⌕', system:'◈' };
  return (
    <div style={{ display:'flex', gap:'8px', padding:'1.5px 0', fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', lineHeight:1.7 }}>
      <span style={{ color:'#1e1e2e', flexShrink:0 }}>{time}</span>
      <span style={{ color:c[type]||'#4b5563', flexShrink:0 }}>{i[type]||'›'}</span>
      <span style={{ color: type==='system'?'#2a2a3a':'#6b7280', wordBreak:'break-all' }}>{text}</span>
    </div>
  );
}


/* ─── DB Answer renderer — displays structured DB data ─── */
function DBAnswer({ answer }) {
  if (!answer) return null;
  const isMono = { fontFamily:"'JetBrains Mono',monospace" };
  const pill = (text, color='#6c63ff') => (
    <span style={{ ...isMono, fontSize:'9px', padding:'2px 8px', borderRadius:'4px',
      color, background:color+'14', border:`1px solid ${color}28` }}>{text}</span>
  );

  return (
    <div style={{ borderRadius:'12px', border:'1px solid rgba(74,222,128,.18)', background:'rgba(74,222,128,.03)', overflow:'hidden', marginBottom:'22px' }}>
      {/* Header */}
      <div style={{ padding:'9px 16px', borderBottom:'1px solid rgba(74,222,128,.1)', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
        <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80', display:'inline-block' }}/>
        <span style={{ ...isMono, fontSize:'9px', color:'#4ade80', letterSpacing:'1.5px' }}>FROM_DATABASE</span>
        <span style={{ ...isMono, fontSize:'10px', color:'#e2e8f0', fontWeight:600 }}>{answer.name}</span>
        {answer.global_var && pill(answer.global_var, '#f59e0b')}
        {answer.scope && answer.scope !== 'both' && pill(answer.scope, '#8b85ff')}
        {answer.tier && pill(answer.tier, '#0ea5e9')}
      </div>

      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:'14px' }}>
        {answer.sections?.map((s, i) => {
          if (s.type === 'overview' && s.content) return (
            <p key={i} style={{ color:'#9ca3af', fontSize:'13.5px', lineHeight:1.7, margin:0 }}>{s.content}</p>
          );

          if (s.type === 'gotcha' && s.content) return (
            <div key={i} style={{ padding:'10px 14px', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.18)', borderRadius:'8px' }}>
              <div style={{ ...isMono, fontSize:'9px', color:'#f59e0b', marginBottom:'5px', letterSpacing:'1px' }}>⚠ GOTCHA</div>
              <p style={{ color:'#d97706', fontSize:'13px', lineHeight:1.6, margin:0 }}>{s.content}</p>
            </div>
          );

          if (s.type === 'tip' && s.content) return (
            <div key={i} style={{ padding:'10px 14px', background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.15)', borderRadius:'8px' }}>
              <div style={{ ...isMono, fontSize:'9px', color:'#10b981', marginBottom:'5px', letterSpacing:'1px' }}>💡 TIP</div>
              <p style={{ color:'#6ee7b7', fontSize:'13px', lineHeight:1.6, margin:0 }}>{s.content}</p>
            </div>
          );

          if (s.type === 'scope' && s.content) return (
            <div key={i} style={{ padding:'10px 14px', background:'rgba(108,99,255,.06)', border:'1px solid rgba(108,99,255,.15)', borderRadius:'8px' }}>
              <div style={{ ...isMono, fontSize:'9px', color:'#6c63ff', marginBottom:'5px', letterSpacing:'1px' }}>SCOPED vs GLOBAL</div>
              <p style={{ color:'#9ca3af', fontSize:'13px', lineHeight:1.6, margin:0 }}>{s.content}</p>
            </div>
          );

          if (s.type === 'setup' && s.items?.length) return (
            <div key={i}>
              <div style={{ ...isMono, fontSize:'9px', color:'#2a2a3a', marginBottom:'8px', letterSpacing:'1px', textTransform:'uppercase' }}>Setup Steps</div>
              {s.items.map((step, j) => (
                <div key={j} style={{ display:'flex', gap:'10px', padding:'5px 0', borderBottom:'1px solid #0d0d18' }}>
                  <span style={{ ...isMono, fontSize:'10px', color:'#4ade80', flexShrink:0, minWidth:'16px' }}>{j+1}.</span>
                  <span style={{ color:'#9ca3af', fontSize:'13px', lineHeight:1.5 }}>{step}</span>
                </div>
              ))}
            </div>
          );

          if (s.type === 'errors' && s.items?.length) return (
            <div key={i}>
              <div style={{ ...isMono, fontSize:'9px', color:'#2a2a3a', marginBottom:'8px', letterSpacing:'1px', textTransform:'uppercase' }}>Common Errors</div>
              {s.items.map((err, j) => {
                const e = typeof err === 'string' ? { error: err, fix: '' } : err;
                return (
                  <div key={j} style={{ padding:'8px 10px', background:'rgba(248,113,113,.05)', border:'1px solid rgba(248,113,113,.12)', borderRadius:'7px', marginBottom:'5px' }}>
                    <div style={{ ...isMono, fontSize:'11px', color:'#f87171' }}>✗ {e.error}</div>
                    {e.fix && <div style={{ ...isMono, fontSize:'11px', color:'#4ade80', marginTop:'4px' }}>✓ {e.fix}</div>}
                  </div>
                );
              })}
            </div>
          );

          if (s.type === 'actions' && s.items?.length) return (
            <div key={i}>
              <div style={{ ...isMono, fontSize:'9px', color:'#2a2a3a', marginBottom:'8px', letterSpacing:'1px', textTransform:'uppercase' }}>Available Actions ({s.items.length})</div>
              <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                {s.items.slice(0, 12).map((a, j) => {
                  const name = typeof a === 'string' ? a : a.name;
                  return <span key={j} style={{ ...isMono, fontSize:'10px', padding:'3px 8px', background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.15)', borderRadius:'5px', color:'#8b85ff' }}>{name}</span>;
                })}
                {s.items.length > 12 && <span style={{ ...isMono, fontSize:'10px', color:'#374151' }}>+{s.items.length-12} more</span>}
              </div>
            </div>
          );

          if (s.type === 'methods' && s.items?.length) return (
            <div key={i}>
              <div style={{ ...isMono, fontSize:'9px', color:'#2a2a3a', marginBottom:'8px', letterSpacing:'1px', textTransform:'uppercase' }}>
                Methods ({s.total || s.items.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                {s.items.slice(0, 8).map((m, j) => (
                  <div key={j} style={{ padding:'7px 10px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'7px' }}>
                    <code style={{ ...isMono, fontSize:'11px', color:'#8b85ff' }}>{m.name || m.path}</code>
                    {(m.desc || m.description) && <p style={{ color:'#6b7280', fontSize:'12px', margin:'3px 0 0', lineHeight:1.4 }}>{m.desc || m.description}</p>}
                  </div>
                ))}
                {s.items.length > 8 && <span style={{ ...isMono, fontSize:'10px', color:'#374151', padding:'4px 0' }}>+{s.items.length-8} more — see API Reference</span>}
              </div>
            </div>
          );

          if (s.type === 'best_practices' && s.items?.length) return (
            <div key={i}>
              <div style={{ ...isMono, fontSize:'9px', color:'#2a2a3a', marginBottom:'8px', letterSpacing:'1px', textTransform:'uppercase' }}>Best Practices</div>
              {s.items.map((b, j) => (
                <div key={j} style={{ display:'flex', gap:'8px', padding:'4px 0', borderBottom:'1px solid #0d0d18' }}>
                  <span style={{ color:'#4ade80', flexShrink:0 }}>✓</span>
                  <span style={{ color:'#6b7280', fontSize:'12.5px', lineHeight:1.5 }}>{b}</span>
                </div>
              ))}
            </div>
          );

          if (s.type === 'when' && s.content) return (
            <div key={i} style={{ padding:'8px 12px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'7px' }}>
              <div style={{ ...isMono, fontSize:'9px', color:'#2a2a3a', marginBottom:'5px', letterSpacing:'1px' }}>WHEN IT RUNS</div>
              <p style={{ color:'#9ca3af', fontSize:'13px', margin:0, lineHeight:1.5 }}>{s.content}</p>
            </div>
          );

          if (s.type === 'code' && s.content) return (
            <div key={i}>
              <div style={{ ...isMono, fontSize:'9px', color:'#2a2a3a', marginBottom:'7px', letterSpacing:'1px', textTransform:'uppercase' }}>Code Example</div>
              <div style={{ background:'#020208', border:'1px solid #0d0d18', borderRadius:'8px', overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 12px', background:'#0a0a14', borderBottom:'1px solid #0d0d18' }}>
                  <span style={{ ...isMono, fontSize:'9px', color:'#6c63ff', letterSpacing:'1px' }}>JAVASCRIPT</span>
                  <button onClick={()=>navigator.clipboard?.writeText(s.content)} style={{ ...isMono, background:'none', border:'1px solid #1a1a2e', borderRadius:'3px', color:'#6b7280', fontSize:'9px', padding:'1px 7px', cursor:'pointer' }}>copy</button>
                </div>
                <pre style={{ margin:0, padding:'12px 14px', overflowX:'auto' }}>
                  <code style={{ ...isMono, fontSize:'11.5px', color:'#7dd3fc', lineHeight:1.7 }}>{s.content}</code>
                </pre>
              </div>
            </div>
          );

          if (s.type === 'meta') return (
            <div key={i} style={{ display:'flex', gap:'8px', flexWrap:'wrap', paddingTop:'4px', borderTop:'1px solid #0d0d18' }}>
              {s.plugin_id  && <span style={{ ...isMono, fontSize:'9px', color:'#374151' }}>plugin: {s.plugin_id}</span>}
              {s.credential_type && <span style={{ ...isMono, fontSize:'9px', color:'#374151' }}>auth: {s.credential_type}</span>}
              {s.min_version && <span style={{ ...isMono, fontSize:'9px', color:'#374151' }}>min: {s.min_version}</span>}
            </div>
          );

          return null;
        })}
      </div>
    </div>
  );
}

export default function Search() {
  const router = useRouter();
  const { data: session } = useSession();
  const inputRef = useRef(null);
  const logRef   = useRef(null);
  const prevQ    = useRef('');

  const [q,         setQ]         = useState('');
  const [context,   setContext]   = useState('');
  const [results,   setResults]   = useState([]);
  const [apiHits,   setApiHits]   = useState([]);
  const [aiAnswer,  setAiAnswer]  = useState('');
  const [dbAnswer,   setDbAnswer]  = useState(null);
  const [streamText,setStreamText]= useState('');
  const [loading,   setLoading]   = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [searched,  setSearched]  = useState(false);
  const [intent,    setIntent]    = useState('');
  const [logs,      setLogs]      = useState([]);
  const [meta,      setMeta]      = useState({});
  const [showCtx,   setShowCtx]   = useState(false);

  const addLog = useCallback((type, text) => {
    const t = new Date().toLocaleTimeString('en-US', { hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
    setLogs(p => [...p.slice(-80), { type, text, time:t, id:Date.now()+Math.random() }]);
  }, []);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  // Boot log
  useEffect(() => {
    [
      { type:'system', text:'snspokes intelligence OS — ready', delay:0 },
      { type:'system', text:'200+ spokes · full API reference · AI answers', delay:150 },
      { type:'info',   text:'awaiting query...', delay:300 },
    ].forEach(l => setTimeout(() => addLog(l.type, l.text), l.delay));
  }, []);

  // URL query
  useEffect(() => {
    const urlQ = router.query.q;
    const urlCtx = router.query.ctx || '';
    if (urlQ && urlQ !== prevQ.current) {
      prevQ.current = urlQ;
      setQ(urlQ);
      if (urlCtx) setContext(urlCtx);
      runSearch(urlQ, urlCtx);
    }
  }, [router.query.q, router.query.ctx]);

  const doStream = async (query) => {
    setStreaming(true); setStreamText('');
    addLog('ai', 'generating answer...');
    try {
      const r = await fetch('/api/stream', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query, user_id: session?.user?.id }),
      });
      if (!r.ok) { setStreaming(false); return; }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream:true });
        const lines = buf.split('\n'); buf = lines.pop()||'';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type==='chunk') setStreamText(p => p+d.content);
            if (d.type==='done') addLog('success', `done · ${d.model||'AI'}`);
          } catch {}
        }
      }
    } catch { addLog('error', 'stream failed'); }
    finally { setStreaming(false); }
  };

  const runSearch = useCallback(async (query, ctx = context) => {
    if (!query?.trim()) return;
    setLoading(true);
    setResults([]); setApiHits([]); setAiAnswer(''); setStreamText(''); setDbAnswer(null);
    setSearched(true); setIntent('');
    addLog('search', `"${query}"${ctx ? ` [${ctx}]` : ''}`);
    addLog('info', 'searching spoke index + API reference...');
    const t0 = Date.now();
    try {
      const r = await fetch('/api/search', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query: query.trim(), user_id: session?.user?.id, context: ctx }),
      });
      const d = await r.json();
      if (!r.ok) { addLog('error', d.error||'search failed'); return; }
      setResults(d.results || []);
      setApiHits(d.api_results || []);
      setDbAnswer(d.db_answer || null);
      if (d.intent) setIntent(d.intent);
      const spokeCount = (d.results||[]).length;
      const apiCount   = (d.api_results||[]).length;
      addLog('success', `${spokeCount} spokes · ${apiCount} API refs · ${Date.now()-t0}ms${d.cached?' [cached]':''}`);
      if (d.ai_answer) {
        setAiAnswer(d.ai_answer);
        addLog('ai', `answer ready · ${d.ai_model||'AI'} · intent: ${d.intent||'explain'}`);
      } else {
        addLog('ai', 'generating answer...');
        doStream(query.trim());
      }
      setMeta({ latency: Date.now()-t0, cached: d.cached });
      // Save to memory
      if (session?.user?.id) {
        fetch('/api/user/memory', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'save_query', query, name:query.slice(0,60) }) }).catch(()=>{});
      }
    } catch(err) { addLog('error', err.message); }
    finally { setLoading(false); }
  }, [session, addLog, context]);

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    const url = `/search?q=${encodeURIComponent(q.trim())}${context?`&ctx=${context}`:''}`;
    router.push(url, undefined, { shallow:true });
    runSearch(q.trim(), context);
  };

  const aiText = aiAnswer || streamText;
  const ctxMeta = CONTEXTS.find(c => c.id === context) || CONTEXTS[0];
  const intentMeta = INTENT_META[intent];

  return (
    <>
      <Head>
        <title>{q ? `${q} — snspokes` : 'Search — snspokes'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
          @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
          .scanline{position:fixed;top:0;left:0;right:0;height:2px;background:linear-gradient(transparent,rgba(108,99,255,.03),transparent);animation:scanline 10s linear infinite;pointer-events:none;z-index:9998}
          .ctx-btn:hover{background:rgba(255,255,255,.04)!important}
        `}</style>
      </Head>
      <div className="scanline"/>

      {/* Top bar */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'rgba(4,4,7,.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid #0d0d18' }}>
        <div style={{ maxWidth:'1400px', margin:'0 auto', padding:'0 20px', height:'56px', display:'flex', alignItems:'center', gap:'14px' }}>
          <Link href="/" style={{ textDecoration:'none', flexShrink:0 }}>
            <img src="/logo.svg" height="26" style={{ borderRadius:'5px' }} alt="snspokes"/>
          </Link>

          {/* Search form */}
          <form onSubmit={submit} style={{ flex:1, maxWidth:'560px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px', background:'#0a0a14', border:'1px solid #1a1a2e', borderRadius:'10px', transition:'border-color .2s' }}
              onFocusCapture={e=>e.currentTarget.style.borderColor='#6c63ff'}
              onBlurCapture={e=>e.currentTarget.style.borderColor='#1a1a2e'}>
              <svg width="13" height="13" fill="none" stroke="#374151" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)}
                placeholder="search or ask anything about ServiceNow..."
                style={{ flex:1, background:'none', border:'none', outline:'none', color:'#e8eaf6', fontSize:'13px', fontFamily:"'JetBrains Mono',monospace" }}/>
              {(loading||streaming) && <div style={{ width:'13px', height:'13px', border:'1.5px solid #1e1e2e', borderTopColor:'#6c63ff', borderRadius:'50%', animation:'spin .6s linear infinite', flexShrink:0 }}/>}
            </div>
          </form>

          {/* WHO ARE YOU selector — the key differentiator */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <button onClick={()=>setShowCtx(s=>!s)} className="ctx-btn"
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background: context?'rgba(108,99,255,.1)':'rgba(255,255,255,.03)', border:`1px solid ${context?'rgba(108,99,255,.3)':'rgba(255,255,255,.06)'}`, borderRadius:'8px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color: context?'#8b85ff':'#4b5563', transition:'all .15s', whiteSpace:'nowrap' }}>
              <span>{ctxMeta.icon}</span>
              <span>{ctxMeta.label}</span>
              <span style={{ opacity:.5 }}>▾</span>
            </button>

            {showCtx && (
              <div style={{ position:'absolute', top:'42px', right:0, background:'#06060e', border:'1px solid #1a1a2e', borderRadius:'12px', padding:'8px', zIndex:200, minWidth:'220px', boxShadow:'0 16px 48px rgba(0,0,0,.6)' }}>
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#1e1e2e', margin:'0 0 6px 6px', letterSpacing:'1px' }}>I AM A...</p>
                {CONTEXTS.map(c => (
                  <button key={c.id} onClick={()=>{ setContext(c.id); setShowCtx(false); if (q.trim()) { router.push(`/search?q=${encodeURIComponent(q.trim())}${c.id?`&ctx=${c.id}`:''}`); runSearch(q.trim(), c.id); } }}
                    style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'8px 10px', background: context===c.id?'rgba(108,99,255,.1)':'transparent', border:'none', borderRadius:'8px', cursor:'pointer', textAlign:'left', transition:'background .1s' }}>
                    <span style={{ fontSize:'14px' }}>{c.icon}</span>
                    <div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'12.5px', fontWeight:600, color: context===c.id?'#8b85ff':'#e2e8f0' }}>{c.label}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#374151' }}>{c.desc}</div>
                    </div>
                    {context===c.id && <span style={{ marginLeft:'auto', color:'#6c63ff', fontSize:'12px' }}>✓</span>}
                  </button>
                ))}
                <div style={{ margin:'8px 6px 2px', padding:'8px', background:'rgba(108,99,255,.06)', border:'1px solid rgba(108,99,255,.1)', borderRadius:'7px' }}>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#6c63ff', margin:'0 0 3px', letterSpacing:'.5px' }}>WHY THIS MATTERS</p>
                  <p style={{ color:'#4b5563', fontSize:'11px', margin:0, lineHeight:1.5 }}>
                    Answers are tailored to your background. A Jira admin gets Jira-language explanations. A Python dev gets REST examples.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Nav links */}
          <div style={{ display:'flex', gap:'8px', marginLeft:'auto' }}>
            <Link href="/api-reference" style={{ padding:'5px 12px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:'7px', color:'#4b5563', fontSize:'11px', fontFamily:"'JetBrains Mono',monospace", textDecoration:'none', whiteSpace:'nowrap' }}>api_ref</Link>
            <Link href="/tools/error-finder" style={{ padding:'5px 12px', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.12)', borderRadius:'7px', color:'#d97706', fontSize:'11px', fontFamily:"'JetBrains Mono',monospace", textDecoration:'none', whiteSpace:'nowrap' }}>err_fix</Link>
            {session ? (
              <Link href="/dashboard" style={{ width:'30px', height:'30px', borderRadius:'50%', background:'linear-gradient(135deg,#6c63ff,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'#fff', textDecoration:'none' }}>
                {session.user?.name?.[0]?.toUpperCase()||'?'}
              </Link>
            ) : (
              <Link href="/login" style={{ padding:'5px 14px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', borderRadius:'7px', color:'#fff', fontSize:'12px', fontWeight:600, textDecoration:'none' }}>sign in</Link>
            )}
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div style={{ display:'flex', height:'100vh', paddingTop:'56px', background:'#040407', fontFamily:"'DM Sans',sans-serif", overflow:'hidden' }}>

        {/* LEFT — terminal log */}
        <div style={{ width:'280px', flexShrink:0, borderRight:'1px solid #0d0d18', display:'flex', flexDirection:'column', background:'#020205' }}>
          <div style={{ padding:'9px 12px', borderBottom:'1px solid #0d0d18', display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ display:'flex', gap:'4px' }}>{['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:'7px', height:'7px', borderRadius:'50%', background:c, opacity:.7 }}/>)}</div>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#2a2a3a', letterSpacing:'1px' }}>SYSTEM LOG</span>
            <div style={{ marginLeft:'auto', width:'5px', height:'5px', borderRadius:'50%', background:'#4ade80', animation:'blink 3s step-end infinite' }}/>
          </div>
          <div ref={logRef} style={{ flex:1, overflowY:'auto', padding:'10px 12px', scrollbarWidth:'thin', scrollbarColor:'#1a1a2e transparent' }}>
            {logs.map(l=><LogLine key={l.id} {...l}/>)}
          </div>
          {/* Quick example queries */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid #0d0d18' }}>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#1e1e2e', marginBottom:'6px', letterSpacing:'1px' }}>TRY THESE</p>
            {[
              context==='jira-admin' ? 'How do I sync Jira issues to SN incidents?' :
              context==='python-dev' ? 'Authenticate to ServiceNow REST API python' :
              context==='beginner'   ? 'What is a Business Rule' :
              'GlideRecord query with OR condition',
              context==='error' ? '' : 'Table API vs Import Set API when to use',
              'How to fix ACL restriction error',
            ].filter(Boolean).slice(0,3).map(cmd=>(
              <button key={cmd} onClick={()=>{ setQ(cmd); router.push(`/search?q=${encodeURIComponent(cmd)}${context?`&ctx=${context}`:''}`); runSearch(cmd, context); }}
                style={{ display:'block', width:'100%', textAlign:'left', padding:'3px 0', background:'none', border:'none', fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', cursor:'pointer', transition:'color .1s', lineHeight:1.5 }}
                onMouseOver={e=>e.currentTarget.style.color='#8b85ff'}
                onMouseOut={e=>e.currentTarget.style.color='#2a2a3a'}>
                › {cmd.slice(0,38)}{cmd.length>38?'…':''}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — results */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 28px', scrollbarWidth:'thin', scrollbarColor:'#1a1a2e transparent' }}>

          {/* Empty state */}
          {!searched && (
            <div style={{ paddingTop:'40px', maxWidth:'640px' }}>
              {/* USP banner — show what makes this different */}
              <div style={{ padding:'16px 20px', background:'rgba(108,99,255,.04)', border:'1px solid rgba(108,99,255,.12)', borderRadius:'12px', marginBottom:'28px' }}>
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#6c63ff', marginBottom:'10px', letterSpacing:'1.5px' }}>HOW THIS IS DIFFERENT FROM servicenow.com/docs</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  {[
                    { icon:'⚖️', t:'When to use what', d:'Docs say HOW. We say WHEN and WHY.' },
                    { icon:'🐛', t:'Error → Fix instantly', d:'Paste any error, get root cause + fix.' },
                    { icon:'🌍', t:'Your platform, your language', d:'Jira admin? Python dev? We translate.' },
                    { icon:'💻', t:'Copy-paste ready code', d:'Not syntax fragments. Real patterns.' },
                  ].map(f=>(
                    <div key={f.t} style={{ padding:'10px 12px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'8px' }}>
                      <div style={{ fontSize:'16px', marginBottom:'4px' }}>{f.icon}</div>
                      <div style={{ color:'#e2e8f0', fontSize:'12.5px', fontWeight:600, marginBottom:'2px' }}>{f.t}</div>
                      <div style={{ color:'#374151', fontSize:'11px', lineHeight:1.45, fontFamily:"'JetBrains Mono',monospace" }}>{f.d}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Context prompt */}
              {!context && (
                <div style={{ padding:'12px 16px', background:'rgba(245,158,11,.05)', border:'1px solid rgba(245,158,11,.15)', borderRadius:'10px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'16px' }}>💡</span>
                  <div>
                    <p style={{ color:'#f59e0b', fontSize:'12.5px', fontWeight:600, margin:'0 0 2px' }}>Tell us who you are for better answers</p>
                    <p style={{ color:'#6b7280', fontSize:'11.5px', margin:0 }}>Click <strong style={{ color:'#9ca3af' }}>SN Developer ▾</strong> in the header to set your context</p>
                  </div>
                </div>
              )}

              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#1e1e2e', marginBottom:'12px', letterSpacing:'1px' }}>POPULAR QUERIES</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px' }}>
                {[
                  { q:'Table API vs Import Set API when to use', icon:'⚖️', tag:'decision' },
                  { q:'GlideRecord query multiple conditions', icon:'🗄️', tag:'code' },
                  { q:'INVALID_SESSION_ID error ServiceNow', icon:'🐛', tag:'error' },
                  { q:'How to set up Slack Integration Hub', icon:'💬', tag:'setup' },
                  { q:'Business Rule vs Script Include vs Client Script', icon:'⚖️', tag:'decision' },
                  { q:'OAuth 2.0 outbound REST ServiceNow', icon:'🔐', tag:'setup' },
                ].map(s=>(
                  <button key={s.q} onClick={()=>{ setQ(s.q); router.push(`/search?q=${encodeURIComponent(s.q)}`); runSearch(s.q); }}
                    style={{ padding:'10px 12px', background:'rgba(255,255,255,.015)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'9px', cursor:'pointer', textAlign:'left', transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,.25)';e.currentTarget.style.background='rgba(108,99,255,.04)';}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.04)';e.currentTarget.style.background='rgba(255,255,255,.015)';}}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                      <span style={{ fontSize:'13px' }}>{s.icon}</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'8.5px', color: s.tag==='error'?'#f87171':s.tag==='decision'?'#f59e0b':'#6c63ff',
                        background: s.tag==='error'?'rgba(248,113,113,.1)':s.tag==='decision'?'rgba(245,158,11,.1)':'rgba(108,99,255,.1)',
                        padding:'1px 6px', borderRadius:'3px' }}>{s.tag}</span>
                    </div>
                    <p style={{ color:'#6b7280', fontSize:'12px', margin:0, lineHeight:1.4 }}>{s.q}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {searched && (
            <div style={{ maxWidth:'760px' }}>

              {/* Query header + intent badge */}
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px', flexWrap:'wrap' }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#2a2a3a' }}>›</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'13px', color:'#8b85ff' }}>"{q}"</span>
                {intentMeta && (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9.5px', color:intentMeta.color,
                    background: intentMeta.color+'12', border:`1px solid ${intentMeta.color}25`,
                    padding:'2px 8px', borderRadius:'4px', display:'flex', alignItems:'center', gap:'4px' }}>
                    {intentMeta.icon} {intentMeta.label}
                  </span>
                )}
                {ctxMeta.id && (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9.5px', color:'#8b85ff',
                    background:'rgba(108,99,255,.1)', border:'1px solid rgba(108,99,255,.2)',
                    padding:'2px 8px', borderRadius:'4px' }}>
                    {ctxMeta.icon} {ctxMeta.label} mode
                  </span>
                )}
                {meta.latency && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#1e1e2e', marginLeft:'auto' }}>{meta.latency}ms{meta.cached?' [cached]':''}</span>}
              </div>

              {/* DB Answer — from synced ServiceNow data */}
              {searched && dbAnswer && <DBAnswer answer={dbAnswer} />}

              {/* AI Answer — only shown when DB had no answer */}
              {(aiText || loading || streaming) && !dbAnswer && (
                <div style={{ marginBottom:'22px', borderRadius:'12px', border:'1px solid rgba(108,99,255,.18)', background:'rgba(108,99,255,.03)', overflow:'hidden' }}>
                  <div style={{ padding:'9px 16px', borderBottom:'1px solid rgba(108,99,255,.1)', display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: streaming?'#f59e0b':'#4ade80', display:'inline-block', animation:streaming?'blink 1s infinite':'none' }}/>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#6c63ff', letterSpacing:'1.5px' }}>
                      {streaming ? 'GENERATING...' : 'AI_ANSWER'}
                    </span>
                    {intentMeta && !streaming && (
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'8px', color:intentMeta.color, marginLeft:'4px' }}>{intentMeta.icon} {intentMeta.desc}</span>
                    )}
                  </div>
                  <div style={{ padding:'16px 18px' }}>
                    {loading && !aiText && !streamText ? (
                      <div style={{ display:'flex', gap:'5px' }}>
                        {[0,1,2].map(i=><div key={i} style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#6c63ff', animation:`blink 1s ${i*.2}s infinite` }}/>)}
                      </div>
                    ) : <Md text={aiText} />}
                  </div>
                  {aiText && !streaming && (
                    <div style={{ padding:'0 16px 12px' }}>
                      <button onClick={()=>navigator.clipboard?.writeText(aiText)}
                        style={{ padding:'3px 10px', background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.15)', borderRadius:'5px', color:'#8b85ff', fontSize:'10px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
                        copy_answer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Spoke results */}
              {results.length > 0 && (
                <div style={{ marginBottom:'20px' }}>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9.5px', color:'#2a2a3a', letterSpacing:'1.5px', marginBottom:'10px' }}>MATCHED SPOKES ({results.length})</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'6px' }}>
                    {results.slice(0,6).map(s=>(
                      <Link key={s.slug} href={`/spoke/${s.slug}`} style={{ textDecoration:'none', display:'block' }}>
                        <div style={{ padding:'11px 13px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:'9px', transition:'all .15s' }}
                          onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,.3)';e.currentTarget.style.background='rgba(108,99,255,.04)';}}
                          onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.05)';e.currentTarget.style.background='rgba(255,255,255,.02)';}}>
                          <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'4px' }}>
                            <span style={{ fontSize:'15px' }}>{s.icon||'🔌'}</span>
                            <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600 }}>{s.name}</span>
                            {s.category && <span style={{ fontSize:'9.5px', color:'#374151', background:'rgba(255,255,255,.04)', padding:'1px 6px', borderRadius:'10px' }}>{s.category}</span>}
                          </div>
                          <p style={{ color:'#4b5563', fontSize:'11.5px', margin:0, lineHeight:1.4 }}>{(s.description||'').slice(0,70)}{(s.description||'').length>70?'…':''}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* API reference hits */}
              {apiHits.length > 0 && (
                <div style={{ marginBottom:'20px' }}>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9.5px', color:'#2a2a3a', letterSpacing:'1.5px', marginBottom:'10px' }}>API REFERENCE ({apiHits.length})</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                    {apiHits.map(api=>(
                      <Link key={api.slug} href={`/api-reference?q=${encodeURIComponent(api.name)}`} style={{ textDecoration:'none', display:'block' }}>
                        <div style={{ padding:'9px 12px', background:'rgba(255,255,255,.015)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'8px', display:'flex', alignItems:'center', gap:'10px', transition:'all .15s' }}
                          onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,.25)';}}
                          onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.04)';}}>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', padding:'2px 7px', borderRadius:'4px',
                            color: api.api_type==='rest'?'#0ea5e9':api.api_type==='client'?'#f59e0b':'#8b85ff',
                            background: api.api_type==='rest'?'rgba(14,165,233,.1)':api.api_type==='client'?'rgba(245,158,11,.1)':'rgba(108,99,255,.1)' }}>
                            {api.api_type}
                          </span>
                          <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600 }}>{api.name}</span>
                          {api.global_var && <code style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#6c63ff' }}>{api.global_var}</code>}
                          <span style={{ color:'#374151', fontSize:'11px', marginLeft:'auto' }}>→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {!loading && !aiText && !streaming && results.length === 0 && apiHits.length === 0 && (
                <div style={{ textAlign:'center', padding:'48px 0' }}>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#1e1e2e', marginBottom:'6px' }}>NO_RESULTS</p>
                  <p style={{ color:'#374151', fontSize:'13px' }}>No matches for "{q}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close context menu */}
      {showCtx && <div style={{ position:'fixed', inset:0, zIndex:100 }} onClick={()=>setShowCtx(false)}/>}
    </>
  );
}
