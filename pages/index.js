import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const SPOKES = [
  { slug:'slack',           name:'Slack',       icon:'💬', color:'#4A154B', bg:'rgba(74,21,75,.18)' },
  { slug:'jira',            name:'Jira',        icon:'🔷', color:'#0052CC', bg:'rgba(0,82,204,.18)' },
  { slug:'microsoft-teams', name:'Teams',       icon:'🟦', color:'#5059C9', bg:'rgba(80,89,201,.18)' },
  { slug:'github',          name:'GitHub',      icon:'🐙', color:'#4ade80', bg:'rgba(74,222,128,.12)' },
  { slug:'aws',             name:'AWS',         icon:'☁️', color:'#FF9900', bg:'rgba(255,153,0,.14)' },
  { slug:'pagerduty',       name:'PagerDuty',   icon:'🚨', color:'#25c151', bg:'rgba(37,193,81,.14)' },
  { slug:'salesforce',      name:'Salesforce',  icon:'☁️', color:'#00A1E0', bg:'rgba(0,161,224,.14)' },
  { slug:'okta',            name:'Okta',        icon:'🔐', color:'#007DC1', bg:'rgba(0,125,193,.14)' },
  { slug:'azure',           name:'Azure',       icon:'🔵', color:'#0078D4', bg:'rgba(0,120,212,.14)' },
  { slug:'google',          name:'Google',      icon:'🔴', color:'#EA4335', bg:'rgba(234,67,53,.14)' },
];

const TOOLS = [
  { href:'/tools/code-generator', icon:'💻', name:'Code Generator', tag:'code_gen', desc:'Describe any ServiceNow script — get production-ready code.', accent:'#6c63ff' },
  { href:'/tools/error-finder',   icon:'🐛', name:'Error Finder',   tag:'err_fix',  desc:'Paste any error. Root cause + fix in seconds.', accent:'#f59e0b' },
  { href:'/tools/cheatsheet',     icon:'📖', name:'Cheatsheet',     tag:'ref_docs', desc:'Every GlideRecord, gs, g_form method. Always fast.', accent:'#10b981' },
];

const BOOT_SEQUENCE = [
  { delay:0,    text:'initializing snspokes intelligence OS...', color:'#2a2a3a' },
  { delay:300,  text:'loading spoke index: 200+ integrations found', color:'#374151' },
  { delay:600,  text:'AI providers: online', color:'#4ade80' },
  { delay:900,  text:'search engine: ready', color:'#4ade80' },
  { delay:1200, text:'developer tools: code_gen | err_fix | ref_docs', color:'#8b85ff' },
  { delay:1500, text:'', color:'' },
  { delay:1600, text:'> system ready. awaiting query.', color:'#6c63ff' },
];

function useVisible(ref, threshold=0.15) {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return v;
}

function Counter({ end, suffix='' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let s=0; const step=end/50;
        const iv = setInterval(()=>{ s+=step; if(s>=end){setVal(end);clearInterval(iv);}else setVal(Math.floor(s)); },28);
        obs.disconnect();
      }
    },{ threshold:0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  },[]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [bootLines, setBootLines] = useState([]);
  const [bootDone, setBootDone] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);

  const toolsRef = useRef(null);
  const stepsRef = useRef(null);
  const proofRef = useRef(null);
  const toolsV = useVisible(toolsRef);
  const stepsV = useVisible(stepsRef);
  const proofV = useVisible(proofRef);

  // Boot sequence
  useEffect(() => {
    BOOT_SEQUENCE.forEach((line, i) => {
      setTimeout(() => {
        if (line.text) setBootLines(p => [...p, line]);
        if (i === BOOT_SEQUENCE.length - 1) setTimeout(() => setBootDone(true), 300);
      }, line.delay);
    });
  }, []);

  // Scroll progress
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      setScrollPct((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100 || 0);
    };
    window.addEventListener('scroll', update, { passive:true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const go = (e) => {
    e.preventDefault();
    if (q.trim()) router.push('/search?q=' + encodeURIComponent(q.trim()));
  };

  return (
    <>
      <Head>
        <title>snspokes — Developer Intelligence OS</title>
        <meta name="description" content="AI-powered search and tools for ServiceNow Integration Hub developers. 200+ spokes, code generation, error analysis." />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes fadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
          @keyframes tick     { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
          @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
          @keyframes glow     { 0%,100%{opacity:.4} 50%{opacity:.8} }

          .fu   { animation:fadeUp .6s cubic-bezier(.22,1,.36,1) both; }
          .d1   { animation-delay:.05s } .d2{animation-delay:.15s} .d3{animation-delay:.25s}
          .d4   { animation-delay:.35s } .d5{animation-delay:.48s}

          .gt   { background:linear-gradient(135deg,#fff 0%,#8b85ff 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

          .ticker-inner { animation:tick 28s linear infinite; }
          .ticker-inner:hover { animation-play-state:paused; }
          .ticker-wrap  { overflow:hidden; mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent); }

          .tool-card { transition:transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s ease, border-color .22s ease, background .22s ease; }
          .tool-card:hover { transform:translateY(-4px); }

          .scanline { position:fixed; top:0; left:0; right:0; height:2px; background:linear-gradient(transparent,rgba(108,99,255,.035),transparent); animation:scanline 10s linear infinite; pointer-events:none; z-index:9998; }

          #scroll-prog { position:fixed; top:0; left:0; height:1.5px; background:linear-gradient(to right,#6c63ff,#a855f7); z-index:9999; pointer-events:none; transition:width .1s linear; }

          .cta-pulse { animation:glow 2.5s ease-in-out infinite; }
        `}</style>
      </Head>

      <div className="scanline" />
      <div id="scroll-prog" style={{ width: scrollPct + '%' }} />

      <Navbar />

      <main style={{ background:'#040407', color:'#e8eaf6', fontFamily:"'DM Sans',sans-serif", overflowX:'hidden' }}>

        {/* ═══ HERO ═══ */}
        <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'100px 24px 80px', position:'relative', overflow:'hidden',
          background:'radial-gradient(ellipse at 20% 50%,rgba(108,99,255,.1) 0%,transparent 55%), radial-gradient(ellipse at 80% 20%,rgba(168,85,247,.06) 0%,transparent 50%), #040407',
        }}>
          {/* Grid */}
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(108,99,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,.03) 1px,transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }} />

          <div style={{ maxWidth:'800px', width:'100%', textAlign:'center', position:'relative', zIndex:1 }}>

            {/* Terminal boot block */}
            <div className="fu d1" style={{ display:'inline-block', background:'#020208', border:'1px solid #0d0d18', borderRadius:'10px', padding:'16px 20px', marginBottom:'40px', textAlign:'left', minWidth:'380px', maxWidth:'100%' }}>
              <div style={{ display:'flex', gap:'5px', marginBottom:'12px' }}>
                {['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:'8px', height:'8px', borderRadius:'50%', background:c, opacity:.7 }}/>)}
                <span style={{ marginLeft:'8px', fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#1e1e2e', letterSpacing:'1px' }}>snspokes — terminal</span>
              </div>
              {bootLines.map((l,i) => (
                <div key={i} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px', lineHeight:'1.8', color:l.color }}>
                  {l.text}
                </div>
              ))}
              {bootDone && (
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px', color:'#6c63ff', marginTop:'2px' }}>
                  {'> '}<span style={{ borderRight:'1.5px solid #6c63ff', paddingRight:'1px', animation:'blink 1s step-end infinite' }}></span>
                </div>
              )}
            </div>

            {/* Headline */}
            <h1 className="fu d2" style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(34px,5.5vw,62px)', fontWeight:800, lineHeight:1.05, letterSpacing:'-2px', marginBottom:'18px', color:'#f0f4ff' }}>
              The fastest answer to<br/>
              <span className="gt">any ServiceNow question.</span>
            </h1>

            <p className="fu d3" style={{ color:'#4b5563', fontSize:'17px', lineHeight:1.7, maxWidth:'480px', margin:'0 auto 40px' }}>
              Search 200+ Integration Hub spokes. AI answers with working code. Free forever.
            </p>

            {/* Search bar */}
            <form onSubmit={go} className="fu d4">
              <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px', maxWidth:'580px', margin:'0 auto',
                background:'rgba(255,255,255,.03)', borderRadius:'14px',
                border: focused ? '1px solid rgba(108,99,255,.5)' : '1px solid rgba(255,255,255,.06)',
                boxShadow: focused ? '0 0 0 3px rgba(108,99,255,.1),0 16px 48px rgba(0,0,0,.5)' : '0 8px 32px rgba(0,0,0,.4)',
                backdropFilter:'blur(20px)', transition:'border-color .2s, box-shadow .2s',
              }}>
                <div style={{ paddingLeft:'10px', flexShrink:0 }}>
                  <svg width="15" height="15" fill="none" stroke="#374151" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input value={q} onChange={e=>setQ(e.target.value)}
                  onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
                  placeholder="search or ask anything about ServiceNow..."
                  style={{ flex:1, background:'none', border:'none', outline:'none', color:'#e8eaf6', fontSize:'14.5px', fontFamily:"'JetBrains Mono',monospace", padding:'12px 8px', minWidth:0 }}
                  autoFocus />
                <button type="submit" style={{ flexShrink:0, padding:'11px 22px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'13.5px', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap', transition:'opacity .15s,transform .15s' }}
                  onMouseOver={e=>{e.currentTarget.style.opacity='.88';e.currentTarget.style.transform='translateY(-1px)';}}
                  onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)';}}>
                  search →
                </button>
              </div>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#1e1e2e', marginTop:'12px' }}>
                press <kbd style={{ padding:'1px 6px', background:'#0a0a14', border:'1px solid #1a1a2e', borderRadius:'4px', color:'#374151' }}>⌘K</kbd> from anywhere
              </p>
            </form>

            {/* Stats */}
            <div className="fu d5" style={{ display:'flex', gap:'48px', justifyContent:'center', marginTop:'52px', flexWrap:'wrap' }}>
              {[{v:200,s:'+',l:'spokes'},{v:3,s:'',l:'AI tools'},{v:100,s:'%',l:'free'}].map(st=>(
                <div key={st.l} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'28px', fontWeight:800, color:'#f0f4ff', lineHeight:1 }}><Counter end={st.v} suffix={st.s}/></div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginTop:'5px', letterSpacing:'1px' }}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ TICKER ═══ */}
        <section style={{ padding:'0 0 64px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <p style={{ textAlign:'center', fontFamily:"'JetBrains Mono',monospace", color:'#1e1e2e', fontSize:'10px', fontWeight:600, textTransform:'uppercase', letterSpacing:'2.5px', margin:'0 0 22px', paddingTop:'44px' }}>INTEGRATION HUB SPOKES</p>
          <div className="ticker-wrap">
            <div className="ticker-inner" style={{ display:'inline-flex', gap:0, width:'max-content' }}>
              {[...SPOKES,...SPOKES].map((s,i)=>(
                <Link key={i} href={`/spoke/${s.slug}`} style={{ textDecoration:'none', flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 20px', margin:'0 5px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'50px', cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.background=s.bg;e.currentTarget.style.borderColor=s.color+'50';e.currentTarget.style.transform='translateY(-2px)';}}
                    onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,.02)';e.currentTarget.style.borderColor='rgba(255,255,255,.04)';e.currentTarget.style.transform='translateY(0)';}}>
                    <span style={{ fontSize:'15px' }}>{s.icon}</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', fontWeight:500, color:'#6b7280' }}>{s.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div style={{ textAlign:'center', marginTop:'20px' }}>
            <Link href="/spokes" style={{ fontFamily:"'JetBrains Mono',monospace", color:'#6c63ff', fontSize:'11px', textDecoration:'none', padding:'6px 16px', border:'1px solid rgba(108,99,255,.2)', borderRadius:'20px' }}>view all 200+ →</Link>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section style={{ padding:'100px 24px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div ref={stepsRef} style={{ maxWidth:'960px', margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:'56px' }}>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", color:'#6c63ff', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'3px', marginBottom:'14px' }}>// HOW_IT_WORKS</p>
              <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(26px,4vw,40px)', fontWeight:800, letterSpacing:'-1px', color:'#f0f4ff', lineHeight:1.1 }}>
                {['From', 'question', 'to', 'shipped', 'code'].map((w,i)=>(
                  <span key={i} style={{ display:'inline-block', marginRight:'.28em', opacity:stepsV?1:0, transform:stepsV?'translateY(0)':'translateY(16px)', transition:`opacity .5s ease ${i*.08}s, transform .5s ease ${i*.08}s` }}>{w}</span>
                ))}
              </h2>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'2px' }}>
              {[
                { n:'01', icon:'⌕', t:'search any spoke or topic', d:'Type a question — get an AI answer with real code, not forum threads from 2015.' },
                { n:'02', icon:'⚡', t:'generate or debug code', d:'Code Generator builds scripts from scratch. Error Finder finds the exact null check you missed.', mid:true },
                { n:'03', icon:'⇧', t:'ship faster every day', d:'Reference the Cheatsheet, browse 200+ spoke docs, never context-switch.' },
              ].map((s,i)=>(
                <div key={i} style={{ padding:'32px 28px', background:s.mid?'rgba(108,99,255,.04)':'rgba(255,255,255,.01)', border:'1px solid rgba(255,255,255,.04)', borderRadius:i===0?'16px 0 0 16px':i===2?'0 16px 16px 0':'0', position:'relative', overflow:'hidden',
                  opacity:stepsV?1:0, transform:stepsV?'translateY(0)':'translateY(20px)', transition:`opacity .6s ease ${i*.12}s, transform .6s ease ${i*.12}s` }}>
                  {s.mid && <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px', background:'linear-gradient(to right,transparent,#6c63ff,transparent)' }}/>}
                  <div style={{ display:'flex', gap:'12px', marginBottom:'16px' }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#1e1e2e', fontWeight:600, paddingTop:'3px' }}>{s.n}</span>
                    <div style={{ width:'38px', height:'38px', background:'rgba(108,99,255,.07)', border:'1px solid rgba(108,99,255,.1)', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 }}>{s.icon}</div>
                  </div>
                  <h3 style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12.5px', fontWeight:600, color:'#e8eaf6', marginBottom:'10px', letterSpacing:'.5px' }}>{s.t}</h3>
                  <p style={{ color:'#4b5563', fontSize:'13px', lineHeight:1.65, margin:0 }}>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ TOOLS ═══ */}
        <section style={{ padding:'100px 24px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div ref={toolsRef} style={{ maxWidth:'1080px', margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:'56px' }}>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", color:'#6c63ff', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'3px', marginBottom:'14px' }}>// POWER_TOOLS</p>
              <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(26px,4vw,40px)', fontWeight:800, letterSpacing:'-1px', color:'#f0f4ff', lineHeight:1.1 }}>
                Built for devs who hate wasting time
              </h2>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'12px' }}>
              {TOOLS.map((t,i)=>{
                const rgb = t.accent==='#6c63ff'?'108,99,255':t.accent==='#f59e0b'?'245,158,11':'16,185,129';
                return (
                  <Link key={t.href} href={t.href} style={{ textDecoration:'none' }}>
                    <div className="tool-card" style={{ padding:'26px', borderRadius:'16px', background:'rgba(255,255,255,.015)', border:'1px solid rgba(255,255,255,.05)', cursor:'pointer', height:'100%', position:'relative', overflow:'hidden',
                      opacity:toolsV?1:0, transform:toolsV?'translateY(0)':'translateY(20px)', transition:`opacity .6s ease ${i*.1}s, transform .6s ease ${i*.1}s, box-shadow .22s ease, border-color .22s ease, background .22s ease` }}
                      onMouseOver={e=>{e.currentTarget.style.boxShadow=`0 12px 40px rgba(${rgb},.18)`;e.currentTarget.style.borderColor=`rgba(${rgb},.22)`;e.currentTarget.style.background=`rgba(${rgb},.04)`;}}
                      onMouseOut={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='rgba(255,255,255,.05)';e.currentTarget.style.background='rgba(255,255,255,.015)';}}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px', background:`linear-gradient(to right,transparent,${t.accent}60,transparent)` }}/>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
                        <div style={{ width:'42px', height:'42px', borderRadius:'10px', background:`${t.accent}12`, border:`1px solid ${t.accent}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>{t.icon}</div>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', fontWeight:600, color:t.accent, background:`${t.accent}10`, border:`1px solid ${t.accent}20`, padding:'3px 10px', borderRadius:'20px', letterSpacing:'.5px' }}>{t.tag}</span>
                      </div>
                      <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'18px', fontWeight:700, color:'#e8eaf6', marginBottom:'7px' }}>{t.name}</h3>
                      <p style={{ color:'#4b5563', fontSize:'13px', lineHeight:1.6, marginBottom:'20px' }}>{t.desc}</p>
                      {/* Tiny code preview */}
                      <div style={{ background:'#020208', border:'1px solid rgba(255,255,255,.04)', borderRadius:'8px', padding:'10px 14px' }}>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#374151', lineHeight:1.7 }}>
                          {t.href.includes('code')  && <><div style={{ color:'#6c63ff' }}>$ generate Business Rule</div><div style={{ color:'#4ade80' }}>✓ ready in 3s</div></>}
                          {t.href.includes('error') && <><div style={{ color:'#f87171' }}>✗ TypeError: null.getValue</div><div style={{ color:'#4ade80' }}>✓ fix: add isValidRecord()</div></>}
                          {t.href.includes('cheat') && <><div>gr.addQuery(field, val)</div><div>gs.getUser().getName()</div></>}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'5px', marginTop:'15px', color:t.accent, fontFamily:"'JetBrains Mono',monospace", fontSize:'11px' }}>
                        open → <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'13px', fontWeight:600 }}>{t.name}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══ SOCIAL PROOF ═══ */}
        <section style={{ padding:'100px 24px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div ref={proofRef} style={{ maxWidth:'960px', margin:'0 auto' }}>
            <p style={{ textAlign:'center', fontFamily:"'JetBrains Mono',monospace", color:'#1a1a2e', fontSize:'10px', fontWeight:600, textTransform:'uppercase', letterSpacing:'2px', marginBottom:'28px' }}>TRUSTED_AT</p>
            <div style={{ display:'flex', justifyContent:'center', gap:'40px', flexWrap:'wrap', marginBottom:'64px', opacity:.25 }}>
              {['Accenture','Deloitte','TCS','Infosys','Wipro','HCL'].map(co=>(
                <span key={co} style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'14px', fontWeight:700, color:'#9ca3af', letterSpacing:'.05em' }}>{co}</span>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'12px' }}>
              {[
                { q:'snspokes cut my spoke setup time in half. The AI search actually understands ServiceNow context.', n:'Priya S.', r:'SN Developer · TCS', av:'PS' },
                { q:'I use the Cheatsheet every morning. Code Generator handles all the boilerplate I used to write.', n:'James R.', r:'SN Architect · Deloitte', av:'JR' },
                { q:'Error Finder found the exact null check I was missing — in 3 seconds.', n:'Arun K.', r:'SN Admin · Infosys', av:'AK' },
              ].map((t,i)=>(
                <div key={i} style={{ padding:'22px', background:'rgba(10,10,20,1)', border:'1px solid #0d0d18', borderRadius:'14px', transition:'all .2s',
                  opacity:proofV?1:0, transform:proofV?'translateY(0)':'translateY(18px)', transitionDelay:`${i*.1}s` }}
                  onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,.2)';e.currentTarget.style.background='rgba(108,99,255,.03)';e.currentTarget.style.transform='translateY(-3px)';}}
                  onMouseOut={e=>{e.currentTarget.style.borderColor='#0d0d18';e.currentTarget.style.background='rgba(10,10,20,1)';e.currentTarget.style.transform='translateY(0)';}}>
                  <div style={{ fontFamily:'Georgia,serif', fontSize:'24px', color:'#6c63ff', opacity:.35, marginBottom:'10px' }}>"</div>
                  <p style={{ color:'#6b7280', fontSize:'13.5px', lineHeight:1.7, marginBottom:'16px', fontStyle:'italic' }}>{t.q}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'linear-gradient(135deg,#6c63ff,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'#fff', flexShrink:0 }}>{t.av}</div>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#e8eaf6' }}>{t.n}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginTop:'1px' }}>{t.r}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section style={{ padding:'120px 24px', borderTop:'1px solid rgba(255,255,255,.04)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'500px', height:'260px', background:'radial-gradient(ellipse,rgba(108,99,255,.07) 0%,transparent 70%)', pointerEvents:'none' }}/>
          <div style={{ maxWidth:'520px', margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#6c63ff', letterSpacing:'2px', marginBottom:'20px' }}>$ ./get_started --free --no-card</p>
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(28px,4.5vw,48px)', fontWeight:800, lineHeight:1.05, letterSpacing:'-1.5px', color:'#f0f4ff', marginBottom:'14px' }}>
              Stop Googling.<br/><span className="gt">Start shipping.</span>
            </h2>
            <p style={{ color:'#374151', fontSize:'15px', lineHeight:1.7, marginBottom:'32px' }}>Everything a ServiceNow developer needs. One place. Powered by AI.</p>
            <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
              <Link href="/register" className="cta-pulse" style={{ padding:'14px 32px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', borderRadius:'11px', color:'#fff', fontSize:'14.5px', fontWeight:700, textDecoration:'none', display:'inline-block', boxShadow:'0 0 24px rgba(108,99,255,.3)', transition:'opacity .15s,transform .15s' }}
                onMouseOver={e=>{e.currentTarget.style.opacity='.9';e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)';}}>
                Get Started Free
              </Link>
              <Link href="/search" style={{ padding:'14px 24px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'11px', color:'#6b7280', fontSize:'14.5px', textDecoration:'none', display:'inline-block', transition:'all .15s' }}
                onMouseOver={e=>{e.currentTarget.style.background='rgba(255,255,255,.06)';}}
                onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';}}>
                Try search →
              </Link>
            </div>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", color:'#1a1a2e', fontSize:'10px', marginTop:'16px' }}>no_card | no_setup | instant_access</p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
