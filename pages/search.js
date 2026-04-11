import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

/* ─── Markdown renderer ─── */
function Md({ text }) {
  if (!text) return null;
  const escaped = text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<PRE data-lang="${lang||'code'}">${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</PRE>`)
    .replace(/`([^`\n]+)`/g, '<IC>$1</IC>')
    .replace(/\*\*([^*]+)\*\*/g, '<B>$1</B>')
    .replace(/^#{1,3} (.+)$/gm, '<H>$1</H>')
    .replace(/^[-*] (.+)$/gm, '<LI>$1</LI>')
    .replace(/\n\n/g, '<BR>');

  const html = escaped
    .replace(/<PRE data-lang="([^"]*)">([\s\S]*?)<\/PRE>/g,
      (_, lang, code) => `<div class="md-pre"><div class="md-pre-header"><span class="md-lang">${lang||'code'}</span><button class="md-copy" onclick="navigator.clipboard.writeText(this.closest('.md-pre').querySelector('code').innerText)">copy</button></div><pre><code>${code}</code></pre></div>`)
    .replace(/<IC>(.*?)<\/IC>/g, '<code class="md-ic">$1</code>')
    .replace(/<B>(.*?)<\/B>/g, '<strong>$1</strong>')
    .replace(/<H>(.*?)<\/H>/g, '<div class="md-h">$1</div>')
    .replace(/<LI>(.*?)<\/LI>/g, '<div class="md-li">▸ $1</div>')
    .replace(/<BR>/g, '<div class="md-gap"></div>')
    .replace(/\n/g, '<br/>');

  return (
    <>
      <style>{`
        .md-pre { background:#020208; border:1px solid #1a1a2e; border-radius:8px; margin:.6em 0; overflow:hidden; }
        .md-pre-header { display:flex; justify-content:space-between; align-items:center; padding:6px 14px; background:#0a0a14; border-bottom:1px solid #1a1a2e; }
        .md-lang { font-family:'JetBrains Mono',monospace; font-size:10px; color:#6c63ff; text-transform:uppercase; letter-spacing:1px; }
        .md-copy { background:none; border:1px solid #2a2a3e; border-radius:4px; color:#6b7280; font-size:10px; padding:2px 8px; cursor:pointer; font-family:'JetBrains Mono',monospace; }
        .md-copy:hover { color:#8b85ff; border-color:#6c63ff; }
        .md-pre pre { margin:0; padding:14px 16px; overflow-x:auto; }
        .md-pre code { font-family:'JetBrains Mono',monospace; font-size:12px; color:#7dd3fc; line-height:1.7; }
        .md-ic { background:rgba(108,99,255,.1); border:1px solid rgba(108,99,255,.2); border-radius:4px; padding:1px 6px; font-family:'JetBrains Mono',monospace; font-size:12px; color:#c4beff; }
        .md-h { color:#f0f4ff; font-size:14px; font-weight:700; margin:.8em 0 .3em; font-family:'Bricolage Grotesque',sans-serif; }
        .md-li { color:#c9d1e8; font-size:13.5px; margin:.2em 0; line-height:1.6; padding-left:4px; }
        .md-gap { height:.6em; }
        strong { color:#e8eaf6; }
        br { display:block; content:''; }
        p, span { color:#b0b8d0; font-size:13.5px; line-height:1.7; }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}

/* ─── Terminal log line ─── */
function LogLine({ type = 'info', text, time }) {
  const colors = { info:'#6b7280', success:'#4ade80', error:'#f87171', ai:'#8b85ff', search:'#f59e0b', system:'#38bdf8' };
  const icons  = { info:'›', success:'✓', error:'✗', ai:'⟡', search:'⌕', system:'◈' };
  return (
    <div style={{ display:'flex', gap:'8px', padding:'2px 0', fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px', lineHeight:'1.6', opacity: type==='system' ? 0.5 : 1 }}>
      <span style={{ color:'#2a2a3a', flexShrink:0 }}>{time}</span>
      <span style={{ color:colors[type], flexShrink:0 }}>{icons[type]}</span>
      <span style={{ color: type==='system' ? '#374151' : '#9ca3af', wordBreak:'break-all' }}>{text}</span>
    </div>
  );
}

/* ─── Spoke card (compact) ─── */
function SpokeCard({ spoke }) {
  return (
    <Link href={`/spoke/${spoke.slug}`} style={{ textDecoration:'none', display:'block' }}>
      <div style={{ padding:'12px 14px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:'10px', cursor:'pointer', transition:'all .15s' }}
        onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,.3)';e.currentTarget.style.background='rgba(108,99,255,.04)';}}
        onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.05)';e.currentTarget.style.background='rgba(255,255,255,.02)';}}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
          <span style={{ fontSize:'16px' }}>{spoke.icon || '🔌'}</span>
          <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600 }}>{spoke.name}</span>
          {spoke.category && <span style={{ fontSize:'10px', color:'#4b5563', background:'rgba(255,255,255,.04)', padding:'1px 7px', borderRadius:'10px' }}>{spoke.category}</span>}
        </div>
        <p style={{ color:'#4b5563', fontSize:'12px', margin:0, lineHeight:1.45 }}>{(spoke.description||'').slice(0,70)}{(spoke.description||'').length>70?'…':''}</p>
      </div>
    </Link>
  );
}

/* ─── Skeleton ─── */
function Skel({ h = '14px', w = '100%', mb = '8px' }) {
  return <div className="skeleton" style={{ height:h, width:w, borderRadius:'6px', marginBottom:mb }} />;
}

export default function Search() {
  const router = useRouter();
  const { data: session } = useSession();
  const inputRef   = useRef(null);
  const logRef     = useRef(null);
  const prevQ      = useRef('');

  const [q,          setQ]          = useState('');
  const [results,    setResults]    = useState([]);
  const [aiAnswer,   setAiAnswer]   = useState(null);
  const [streamText, setStreamText] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [streaming,  setStreaming]  = useState(false);
  const [searched,   setSearched]   = useState(false);
  const [error,      setError]      = useState('');
  const [logs,       setLogs]       = useState([]);
  const [meta,       setMeta]       = useState({});

  const addLog = useCallback((type, text) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
    setLogs(prev => [...prev.slice(-80), { type, text, time, id: Date.now() + Math.random() }]);
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // Boot log
  useEffect(() => {
    const bootLines = [
      { type:'system', text:'snspokes intelligence OS v33.10 — ready' },
      { type:'system', text:'search engine online | ai providers loaded' },
      { type:'system', text:'200+ spoke index | redis cache active' },
      { type:'info',   text:'awaiting query...' },
    ];
    bootLines.forEach((l, i) => setTimeout(() => addLog(l.type, l.text), i * 180));
  }, []);

  // URL query
  useEffect(() => {
    const urlQ = router.query.q;
    if (urlQ && urlQ !== prevQ.current) {
      prevQ.current = urlQ;
      setQ(urlQ);
      runSearch(urlQ);
    }
  }, [router.query.q]);

  const doStream = async (query) => {
    if (!query?.trim() || streaming) return;
    setStreaming(true); setStreamText('');
    addLog('ai', 'streaming response...');
    try {
      const res = await fetch('/api/stream', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query, user_id: session?.user?.id }),
      });
      if (!res.ok) { setStreaming(false); return; }
      const reader = res.body.getReader();
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
            if (d.type==='done') {
              addLog('success', `response complete • model: ${d.model||'AI'}`);
              setMeta(m => ({ ...m, model:d.model }));
            }
          } catch {}
        }
      }
    } catch { addLog('error', 'stream failed'); }
    finally { setStreaming(false); }
  };

  const runSearch = useCallback(async (query) => {
    if (!query?.trim()) return;
    setLoading(true); setError('');
    setResults([]); setAiAnswer(null); setStreamText(''); setSearched(true);
    addLog('search', `query: "${query}"`);
    addLog('info',   'searching spoke index...');
    const t0 = Date.now();
    try {
      const res = await fetch('/api/search', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query: query.trim(), user_id: session?.user?.id || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Search failed');
        addLog('error', data.error || 'search failed');
        return;
      }
      const count = (data.results||[]).length;
      setResults(data.results || []);
      addLog('success', `found ${count} spoke${count===1?'':'s'} • ${Date.now()-t0}ms`);

      if (data.ai_answer) {
        setAiAnswer({ text: data.ai_answer, model: data.ai_model });
        addLog('ai', `answer ready • ${data.ai_model||'AI'} ${data.cached?'(cached)':''}`);
      } else {
        addLog('ai', 'generating AI answer...');
        doStream(query.trim());
      }
      setMeta({ latency: Date.now()-t0, cached: data.cached });
    } catch(err) {
      setError('Search failed. Please try again.');
      addLog('error', 'network error');
    } finally { setLoading(false); }
  }, [session, addLog]);

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push('/search?q=' + encodeURIComponent(q.trim()), undefined, { shallow:true });
    runSearch(q.trim());
  };

  const aiText = aiAnswer?.text || streamText;
  const isLoading = loading || streaming;

  return (
    <>
      <Head>
        <title>{q ? `${q} — snspokes` : 'Search — snspokes'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
          .cursor-blink::after { content:'_'; animation:blink 1s step-end infinite; color:#6c63ff; }
          .scanline-effect { position:fixed; top:0; left:0; right:0; height:2px; background:linear-gradient(transparent,rgba(108,99,255,.04),transparent); animation:scanline 8s linear infinite; pointer-events:none; z-index:9998; }
          .ai-pulse { animation: aiPulse 2s ease-in-out infinite; }
          @keyframes aiPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        `}</style>
      </Head>

      <div className="scanline-effect" />

      {/* Top bar */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'rgba(4,4,7,.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid #0d0d18' }}>
        <div style={{ maxWidth:'1400px', margin:'0 auto', padding:'0 20px', height:'56px', display:'flex', alignItems:'center', gap:'16px' }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration:'none', flexShrink:0, display:'flex', alignItems:'center', gap:'8px' }}>
            <img src="/logo.svg" height="26" style={{ borderRadius:'5px' }} alt="snspokes" />
          </Link>

          {/* Search */}
          <form onSubmit={submit} style={{ flex:1, maxWidth:'600px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px', background:'#0a0a14', border:'1px solid #1a1a2e', borderRadius:'10px', transition:'border-color .2s' }}
              onFocusCapture={e=>e.currentTarget.style.borderColor='#6c63ff'}
              onBlurCapture={e=>e.currentTarget.style.borderColor='#1a1a2e'}>
              <svg width="13" height="13" fill="none" stroke="#374151" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)}
                placeholder="search spokes, ask anything..."
                className={!q && !isLoading ? 'cursor-blink' : ''}
                style={{ flex:1, background:'none', border:'none', outline:'none', color:'#e8eaf6', fontSize:'13.5px', fontFamily:"'JetBrains Mono',monospace" }} />
              {q && <button type="button" onClick={()=>setQ('')} style={{ background:'none', border:'none', color:'#374151', cursor:'pointer', fontSize:'14px', lineHeight:1 }}>×</button>}
              {isLoading && <div style={{ width:'14px', height:'14px', border:'1.5px solid #1e1e2e', borderTopColor:'#6c63ff', borderRadius:'50%', animation:'spin .6s linear infinite', flexShrink:0 }} />}
            </div>
          </form>

          {/* Right side */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginLeft:'auto' }}>
            <Link href="/tools/code-generator" style={{ textDecoration:'none', padding:'5px 12px', background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.15)', borderRadius:'7px', color:'#8b85ff', fontSize:'12px', fontFamily:"'JetBrains Mono',monospace", whiteSpace:'nowrap' }}>code_gen</Link>
            <Link href="/tools/error-finder" style={{ textDecoration:'none', padding:'5px 12px', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.15)', borderRadius:'7px', color:'#d97706', fontSize:'12px', fontFamily:"'JetBrains Mono',monospace", whiteSpace:'nowrap' }}>err_fix</Link>
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

      {/* Main split layout */}
      <div style={{ display:'flex', height:'100vh', paddingTop:'56px', background:'#040407', fontFamily:"'DM Sans',sans-serif", overflow:'hidden' }}>

        {/* LEFT — Terminal log */}
        <div style={{ width:'300px', flexShrink:0, borderRight:'1px solid #0d0d18', display:'flex', flexDirection:'column', background:'#020205' }}>
          {/* Terminal header */}
          <div style={{ padding:'10px 14px', borderBottom:'1px solid #0d0d18', display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ display:'flex', gap:'4px' }}>
              {['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:'8px', height:'8px', borderRadius:'50%', background:c, opacity:.7 }}/>)}
            </div>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', letterSpacing:'1px' }}>SYSTEM LOG</span>
            <div style={{ marginLeft:'auto', width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80', animation:'blink 3s step-end infinite' }} />
          </div>

          {/* Log lines */}
          <div ref={logRef} style={{ flex:1, overflowY:'auto', padding:'10px 14px', scrollbarWidth:'thin', scrollbarColor:'#1a1a2e transparent' }}>
            {logs.map(l => <LogLine key={l.id} {...l} />)}
            {isLoading && (
              <div style={{ display:'flex', gap:'8px', padding:'2px 0', fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px' }}>
                <span style={{ color:'#2a2a3a' }}>{new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
                <span style={{ color:'#6c63ff' }} className="ai-pulse">⟳</span>
                <span style={{ color:'#374151' }}>processing...</span>
              </div>
            )}
          </div>

          {/* Quick commands */}
          <div style={{ padding:'10px 14px', borderTop:'1px solid #0d0d18' }}>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#1e1e2e', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'6px' }}>QUICK SEARCH</p>
            {['Slack OAuth setup','GlideRecord query','ACL error fix'].map(cmd=>(
              <button key={cmd} onClick={()=>{ setQ(cmd); router.push('/search?q='+encodeURIComponent(cmd),undefined,{shallow:true}); runSearch(cmd); }}
                style={{ display:'block', width:'100%', textAlign:'left', padding:'4px 0', background:'none', border:'none', fontFamily:"'JetBrains Mono',monospace", fontSize:'10.5px', color:'#374151', cursor:'pointer', transition:'color .15s' }}
                onMouseOver={e=>e.currentTarget.style.color='#8b85ff'}
                onMouseOut={e=>e.currentTarget.style.color='#374151'}>
                › {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — Results */}
        <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', scrollbarWidth:'thin', scrollbarColor:'#1a1a2e transparent' }}>

          {/* Empty state */}
          {!searched && !loading && (
            <div style={{ paddingTop:'60px', maxWidth:'560px' }}>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#1e1e2e', marginBottom:'24px', letterSpacing:'1px' }}>RECENT QUERIES</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {[
                  { icon:'🔌', label:'Slack spoke setup', q:'How to set up Slack spoke in ServiceNow' },
                  { icon:'⚙️', label:'GlideRecord patterns', q:'GlideRecord query best practices' },
                  { icon:'🐛', label:'Debug ACL errors', q:'Fix ACL restriction error ServiceNow' },
                  { icon:'🔑', label:'OAuth configuration', q:'OAuth 2.0 Integration Hub setup' },
                ].map(s=>(
                  <button key={s.q} onClick={()=>{ setQ(s.q); router.push('/search?q='+encodeURIComponent(s.q),undefined,{shallow:true}); runSearch(s.q); }}
                    style={{ padding:'14px', background:'rgba(255,255,255,.015)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'10px', cursor:'pointer', textAlign:'left', transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,.25)';e.currentTarget.style.background='rgba(108,99,255,.04)';}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.04)';e.currentTarget.style.background='rgba(255,255,255,.015)';}}>
                    <div style={{ fontSize:'18px', marginBottom:'6px' }}>{s.icon}</div>
                    <div style={{ color:'#6b7280', fontSize:'12.5px', fontFamily:"'JetBrains Mono',monospace" }}>{s.label}</div>
                  </button>
                ))}
              </div>

              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#1e1e2e', margin:'28px 0 14px', letterSpacing:'1px' }}>BROWSE SPOKES</p>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {['slack','jira','github','aws','salesforce','pagerduty','okta','microsoft-teams'].map(s=>(
                  <Link key={s} href={`/spoke/${s}`} style={{ textDecoration:'none', padding:'4px 12px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'20px', color:'#4b5563', fontSize:'11.5px', fontFamily:"'JetBrains Mono',monospace", transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.color='#8b85ff';e.currentTarget.style.borderColor='rgba(108,99,255,.2)';}}
                    onMouseOut={e=>{e.currentTarget.style.color='#4b5563';e.currentTarget.style.borderColor='rgba(255,255,255,.04)';}}>
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding:'12px 16px', background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.15)', borderRadius:'10px', color:'#f87171', fontSize:'13px', marginBottom:'20px', fontFamily:"'JetBrains Mono',monospace" }}>
              ✗ {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !results.length && (
            <div style={{ maxWidth:'720px' }}>
              <div style={{ padding:'20px', background:'rgba(108,99,255,.04)', border:'1px solid rgba(108,99,255,.1)', borderRadius:'12px', marginBottom:'20px' }}>
                <Skel h="12px" w="80px" mb="14px" /><Skel /><Skel /><Skel w="75%" mb="0" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {[1,2,3,4].map(i=><div key={i}><Skel h="72px" mb="0" /></div>)}
              </div>
            </div>
          )}

          {/* Results */}
          {searched && !loading && (
            <div style={{ maxWidth:'720px' }}>

              {/* Query header */}
              {q && (
                <div style={{ marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#2a2a3a' }}>query:</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'13px', color:'#8b85ff' }}>"{q}"</span>
                  {meta.latency && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#1e1e2e', marginLeft:'auto' }}>{meta.latency}ms {meta.cached?'[cached]':''}</span>}
                </div>
              )}

              {/* AI Answer */}
              {(aiText || streaming) && (
                <div style={{ marginBottom:'24px', borderRadius:'12px', border:'1px solid rgba(108,99,255,.18)', background:'rgba(108,99,255,.03)', overflow:'hidden' }}>
                  <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(108,99,255,.1)', display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: streaming ? '#f59e0b' : '#4ade80', display:'inline-block', animation: streaming ? 'blink 1s infinite' : 'none' }} />
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#6c63ff', letterSpacing:'1.5px' }}>AI_RESPONSE</span>
                    {(aiAnswer?.model||meta.model) && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#1e1e2e', marginLeft:'auto' }}>{aiAnswer?.model||meta.model}</span>}
                  </div>
                  <div style={{ padding:'16px' }}>
                    {streaming && !streamText ? (
                      <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                        {[0,1,2].map(i=><div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#6c63ff', animation:`blink 1s ${i*0.2}s ease-in-out infinite` }}/>)}
                      </div>
                    ) : <Md text={aiText} />}
                  </div>
                  {aiText && !streaming && (
                    <div style={{ padding:'0 16px 12px', display:'flex', gap:'8px' }}>
                      <button onClick={()=>navigator.clipboard?.writeText(aiText)} style={{ padding:'3px 10px', background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.15)', borderRadius:'5px', color:'#8b85ff', fontSize:'10.5px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>copy_answer</button>
                    </div>
                  )}
                </div>
              )}

              {/* Spoke results */}
              {results.length > 0 && (
                <div>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', letterSpacing:'1.5px', marginBottom:'10px' }}>MATCHED SPOKES ({results.length})</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'7px', marginBottom:'24px' }}>
                    {results.slice(0,6).map(s=><SpokeCard key={s.id||s.slug} spoke={s} />)}
                  </div>
                  {results.length > 6 && (
                    <Link href={`/spokes?q=${encodeURIComponent(q)}`} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#4b5563', textDecoration:'none' }}>
                      view all {results.length} results →
                    </Link>
                  )}
                </div>
              )}

              {/* No results */}
              {!loading && !aiText && !streaming && results.length === 0 && (
                <div style={{ textAlign:'center', padding:'48px 0' }}>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#2a2a3a', marginBottom:'8px' }}>NO_RESULTS</p>
                  <p style={{ color:'#374151', fontSize:'13px', marginBottom:'20px' }}>No spokes matched "{q}"</p>
                  <Link href="/spokes" style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#6c63ff', textDecoration:'none', padding:'6px 14px', border:'1px solid rgba(108,99,255,.2)', borderRadius:'6px' }}>browse_all_spokes →</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </>
  );
}
