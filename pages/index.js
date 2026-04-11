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
  { href:'/tools/code-generator', icon:'💻', name:'Code Generator', tagline:'Write zero code', desc:'Business Rules, Script Includes, Client Scripts — describe it, get it.', accent:'#6c63ff' },
  { href:'/tools/error-finder',   icon:'🐛', name:'Error Finder',   tagline:'Debug in seconds', desc:'Paste any ServiceNow error. Root cause + fix instantly.', accent:'#f59e0b' },
  { href:'/tools/cheatsheet',     icon:'📖', name:'Cheatsheet',     tagline:'Never Google again', desc:'Every GlideRecord, gs, g_form method. One page, always fast.', accent:'#10b981' },
];

const WORDS = ['ServiceNow', 'Integration', 'Hub', 'developers'];

function ScrambleText({ text, trigger }) {
  const [display, setDisplay] = useState(text);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  useEffect(() => {
    if (!trigger) return;
    let frame = 0;
    const total = 20;
    const iv = setInterval(() => {
      frame++;
      if (frame >= total) { setDisplay(text); clearInterval(iv); return; }
      setDisplay(text.split('').map((c, i) => {
        if (c === ' ') return ' ';
        if (i < (frame / total) * text.length) return c;
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(''));
    }, 35);
    return () => clearInterval(iv);
  }, [trigger]);
  return <span>{display}</span>;
}

function WordReveal({ text, visible }) {
  const words = text.split(' ');
  return (
    <span>
      {words.map((w, i) => (
        <span key={i} style={{
          display: 'inline-block',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: `opacity .5s ease ${i * 0.08}s, transform .5s ease ${i * 0.08}s`,
          marginRight: '0.28em',
        }}>{w}</span>
      ))}
    </span>
  );
}

function useVisible(ref, threshold = 0.2) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return visible;
}

function Counter({ end, suffix = '' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let s = 0; const step = end / 50;
        const iv = setInterval(() => { s += step; if (s >= end) { setVal(end); clearInterval(iv); } else setVal(Math.floor(s)); }, 30);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

  // Sections visibility
  const toolsRef = useRef(null);
  const stepsRef = useRef(null);
  const proofRef = useRef(null);
  const toolsVisible = useVisible(toolsRef);
  const stepsVisible = useVisible(stepsRef);
  const proofVisible = useVisible(proofRef);

  useEffect(() => { const t = setTimeout(() => setHeroLoaded(true), 300); return () => clearTimeout(t); }, []);

  const go = (e) => {
    e.preventDefault();
    if (q.trim()) router.push('/search?q=' + encodeURIComponent(q.trim()));
  };

  return (
    <>
      <Head>
        <title>snspokes — ServiceNow Developer Toolkit</title>
        <meta name="description" content="AI search, code generation, and docs for 200+ ServiceNow Integration Hub spokes." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          /* Scramble animation */
          @keyframes heroFade { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          .h-fade { animation: heroFade .7s ease both; }
          .h-d1{animation-delay:.1s}.h-d2{animation-delay:.2s}.h-d3{animation-delay:.3s}.h-d4{animation-delay:.4s}.h-d5{animation-delay:.55s}

          /* Gradient text */
          .gt { background:linear-gradient(135deg,#fff 0%,#8b85ff 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

          /* Ticker */
          @keyframes tick { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
          .ticker-inner { animation: tick 28s linear infinite; }
          .ticker-inner:hover { animation-play-state: paused; }
          .ticker-wrap { overflow:hidden; mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent); }

          /* Spoke card hover reveal */
          .spoke-card .spoke-desc { opacity:0; transform:translateY(6px); transition:opacity .2s ease, transform .2s ease; }
          .spoke-card:hover .spoke-desc { opacity:1; transform:translateY(0); }
          .spoke-card { transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s ease, border-color .2s ease, background .2s ease; }
          .spoke-card:hover { transform: translateY(-4px); }

          /* Tool card */
          .tool-card { transition: transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s ease, border-color .22s ease; cursor:pointer; }
          .tool-card:hover { transform: translateY(-4px); }

          /* Scroll progress bar */
          #scroll-bar { position:fixed; top:0; left:0; height:2px; background:linear-gradient(to right,#6c63ff,#a855f7); z-index:9999; transition:width .1s linear; pointer-events:none; }

          /* Word reveal code block */
          .code-terminal { background:#040408; border:1px solid #1a1a2a; border-radius:14px; overflow:hidden; }
          .code-line { font-family:'JetBrains Mono',monospace; font-size:12.5px; line-height:1.8; padding:0 20px; }

          /* CTA pulse */
          @keyframes ctaPulse { 0%{box-shadow:0 0 0 0 rgba(108,99,255,.45)} 70%{box-shadow:0 0 0 14px rgba(108,99,255,0)} 100%{box-shadow:0 0 0 0 rgba(108,99,255,0)} }
          .cta-pulse { animation: ctaPulse 2.5s ease-out infinite; }

          /* Fade up for sections */
          @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
          .reveal-up { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) both; }
        `}</style>
      </Head>

      {/* Scroll progress bar */}
      <ScrollProgress />

      <Navbar />

      <main style={{ background:'#080810', color:'#e8eaf6', fontFamily:"'DM Sans',sans-serif", overflowX:'hidden' }}>

        {/* ══════ HERO ══════ */}
        <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'120px 24px 80px', position:'relative', overflow:'hidden',
          background:'radial-gradient(ellipse at 20% 50%,rgba(108,99,255,.13) 0%,transparent 60%), radial-gradient(ellipse at 80% 20%,rgba(168,85,247,.08) 0%,transparent 50%), #080810',
        }}>
          {/* Animated grid */}
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(108,99,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,.035) 1px,transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }} />

          <div style={{ maxWidth:'760px', width:'100%', textAlign:'center', position:'relative', zIndex:1 }}>

            {/* Terminal badge — terminaltrove style */}
            <div className="h-fade h-d1" style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 14px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(108,99,255,.2)', borderRadius:'8px', marginBottom:'32px', fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px', color:'#6b7280' }}>
              <span style={{ color:'#4ade80' }}>●</span>
              <span style={{ color:'#8b85ff' }}>snspokes</span>
              <span style={{ color:'#374151' }}>~/</span>
              <span style={{ color:'#c9d1e8' }}>ServiceNow Developer Toolkit</span>
            </div>

            {/* Headline with scramble */}
            <h1 className="h-fade h-d2" style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(36px,6vw,66px)', fontWeight:800, lineHeight:1.05, letterSpacing:'-2px', marginBottom:'20px', color:'#f0f4ff' }}>
              The fastest answer to<br />
              <span className="gt">
                <ScrambleText text="any ServiceNow question" trigger={heroLoaded} />
              </span>
            </h1>

            <p className="h-fade h-d3" style={{ color:'#6b7280', fontSize:'18px', lineHeight:1.7, maxWidth:'500px', margin:'0 auto 44px' }}>
              Search 200+ Integration Hub spokes. Get AI answers with working code. Free forever.
            </p>

            {/* Search bar */}
            <form onSubmit={go} className="h-fade h-d4">
              <div style={{
                display:'flex', alignItems:'center', gap:'8px', padding:'8px',
                maxWidth:'600px', margin:'0 auto',
                background:'rgba(255,255,255,.04)', borderRadius:'18px',
                border: focused ? '1px solid rgba(108,99,255,.45)' : '1px solid rgba(255,255,255,.07)',
                boxShadow: focused ? '0 0 0 3px rgba(108,99,255,.12),0 16px 48px rgba(0,0,0,.5)' : '0 8px 32px rgba(0,0,0,.4)',
                backdropFilter:'blur(20px)',
                transition:'border-color .2s,box-shadow .2s',
              }}>
                <div style={{ paddingLeft:'12px', flexShrink:0 }}>
                  <svg width="16" height="16" fill="none" stroke="#4b5563" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Ask anything about ServiceNow…"
                  style={{ flex:1, background:'none', border:'none', outline:'none', color:'#e8eaf6', fontSize:'15.5px', fontFamily:"'DM Sans',sans-serif", padding:'13px 8px', minWidth:0 }}
                  autoFocus
                />
                <button type="submit" style={{ flexShrink:0, padding:'12px 24px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap', transition:'opacity .15s,transform .15s' }}
                  onMouseOver={e=>{e.currentTarget.style.opacity='.88';e.currentTarget.style.transform='translateY(-1px)';}}
                  onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)';}}>
                  Search →
                </button>
              </div>
            </form>

            {/* Stats */}
            <div className="h-fade h-d5" style={{ display:'flex', gap:'48px', justifyContent:'center', marginTop:'56px', flexWrap:'wrap' }}>
              {[{v:200,s:'+',l:'Spokes'},{v:3,s:'',l:'AI Tools'},{v:100,s:'%',l:'Free'}].map(st => (
                <div key={st.l} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'30px', fontWeight:800, color:'#f0f4ff', lineHeight:1 }}><Counter end={st.v} suffix={st.s} /></div>
                  <div style={{ fontSize:'11.5px', color:'#374151', marginTop:'4px', fontWeight:500 }}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ SPOKE TICKER — locomotive/resn style infinite scroll ══════ */}
        <section style={{ padding:'0 0 72px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <p style={{ textAlign:'center', color:'#2a2a3a', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'2.5px', margin:'0 0 24px', paddingTop:'48px' }}>Popular Integration Hub Spokes</p>
          <div className="ticker-wrap">
            <div className="ticker-inner" style={{ display:'inline-flex', gap:0, width:'max-content' }}>
              {[...SPOKES,...SPOKES].map((s,i) => (
                <Link key={i} href={`/spoke/${s.slug}`} style={{ textDecoration:'none', flexShrink:0 }}>
                  <div className="spoke-card" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 22px', margin:'0 6px', background:'rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.055)', borderRadius:'50px', cursor:'pointer', whiteSpace:'nowrap', minWidth:'140px' }}
                    onMouseOver={e=>{e.currentTarget.style.background=s.bg;e.currentTarget.style.borderColor=s.color+'55';}}
                    onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,.025)';e.currentTarget.style.borderColor='rgba(255,255,255,.055)';}}>
                    <span style={{ fontSize:'16px' }}>{s.icon}</span>
                    <span style={{ fontSize:'13px', fontWeight:600, color:'#c9d1e8' }}>{s.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div style={{ textAlign:'center', marginTop:'22px' }}>
            <Link href="/spokes" style={{ color:'#6c63ff', fontSize:'13px', fontWeight:600, textDecoration:'none', padding:'7px 18px', border:'1px solid rgba(108,99,255,.2)', borderRadius:'20px', transition:'all .15s' }}
              onMouseOver={e=>{e.currentTarget.style.background='rgba(108,99,255,.07)';}}
              onMouseOut={e=>{e.currentTarget.style.background='transparent';}}>
              View all 200+ spokes →
            </Link>
          </div>
        </section>

        {/* ══════ HOW IT WORKS — word reveal on scroll (GSAP-inspired, CSS only) ══════ */}
        <section style={{ padding:'100px 24px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div ref={stepsRef} style={{ maxWidth:'1000px', margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:'64px' }}>
              <p style={{ color:'#6c63ff', fontSize:'12px', fontWeight:700, textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'14px' }}>How it works</p>
              <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(28px,4vw,42px)', fontWeight:800, letterSpacing:'-1px', color:'#f0f4ff', lineHeight:1.1 }}>
                <WordReveal text="From question to shipped code in minutes" visible={stepsVisible} />
              </h2>
            </div>

            {/* Steps — codepen card grid style */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'2px' }}>
              {[
                { n:'01', icon:'🔍', t:'Search any spoke or topic', d:'Type a question — "How do I configure Slack OAuth?" — and get an instant AI answer with real code, not forum threads.' },
                { n:'02', icon:'⚡', t:'Generate or debug code', d:'Code Generator builds scripts from scratch. Error Finder gives you the root cause and fix before you finish reading the stack trace.', mid:true },
                { n:'03', icon:'🚀', t:'Ship faster every day', d:'Reference the Cheatsheet, browse 200+ spoke docs, and never context-switch out of your flow.' },
              ].map((s,i) => (
                <div key={i} style={{
                  padding:'36px 32px',
                  background: s.mid ? 'rgba(108,99,255,.05)' : 'rgba(255,255,255,.015)',
                  border:'1px solid rgba(255,255,255,.05)',
                  borderRadius: i===0 ? '20px 0 0 20px' : i===2 ? '0 20px 20px 0' : '0',
                  position:'relative', overflow:'hidden',
                  opacity: stepsVisible ? 1 : 0,
                  transform: stepsVisible ? 'translateY(0)' : 'translateY(24px)',
                  transition:`opacity .6s ease ${i*.12}s, transform .6s ease ${i*.12}s`,
                }}>
                  {s.mid && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(to right,transparent,#6c63ff,transparent)' }} />}
                  <div style={{ display:'flex', gap:'14px', alignItems:'flex-start', marginBottom:'16px' }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#2a2a3a', fontWeight:600, paddingTop:'3px' }}>{s.n}</span>
                    <div style={{ width:'40px', height:'40px', background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.12)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>{s.icon}</div>
                  </div>
                  <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'17px', fontWeight:700, color:'#e8eaf6', marginBottom:'10px' }}>{s.t}</h3>
                  <p style={{ color:'#6b7280', fontSize:'13.5px', lineHeight:1.65, margin:0 }}>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ TOOLS — layers.to/godly masonry-style hover reveal ══════ */}
        <section style={{ padding:'100px 24px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div ref={toolsRef} style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:'64px' }}>
              <p style={{ color:'#6c63ff', fontSize:'12px', fontWeight:700, textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'14px' }}>Power Tools</p>
              <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(28px,4vw,42px)', fontWeight:800, letterSpacing:'-1px', color:'#f0f4ff', lineHeight:1.1 }}>
                <WordReveal text="Built for devs who hate wasting time" visible={toolsVisible} />
              </h2>
              <p style={{ color:'#4b5563', fontSize:'15px', maxWidth:'420px', margin:'14px auto 0', lineHeight:1.6 }}>Three tools. Each solving one real problem every ServiceNow developer faces daily.</p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:'14px' }}>
              {TOOLS.map((t,i) => {
                const rgb = t.accent==='#6c63ff' ? '108,99,255' : t.accent==='#f59e0b' ? '245,158,11' : '16,185,129';
                return (
                  <Link key={t.href} href={t.href} style={{ textDecoration:'none' }}>
                    <div className="tool-card"
                      style={{ padding:'28px', borderRadius:'20px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', position:'relative', overflow:'hidden', height:'100%',
                        opacity: toolsVisible ? 1 : 0,
                        transform: toolsVisible ? 'translateY(0)' : 'translateY(24px)',
                        transition:`opacity .6s ease ${i*.1}s, transform .6s ease ${i*.1}s, box-shadow .22s ease, border-color .22s ease`,
                      }}
                      onMouseOver={e => { e.currentTarget.style.boxShadow=`0 12px 40px rgba(${rgb},.2)`; e.currentTarget.style.borderColor=`rgba(${rgb},.25)`; e.currentTarget.style.background=`rgba(${rgb},.05)`; }}
                      onMouseOut={e  => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='rgba(255,255,255,.06)'; e.currentTarget.style.background='rgba(255,255,255,.02)'; }}>
                      {/* Top accent */}
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px', background:`linear-gradient(to right,transparent,${t.accent}70,transparent)` }} />
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
                        <div style={{ width:'46px', height:'46px', borderRadius:'12px', background:`${t.accent}14`, border:`1px solid ${t.accent}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>{t.icon}</div>
                        <span style={{ fontSize:'11px', fontWeight:600, color:t.accent, background:`${t.accent}12`, border:`1px solid ${t.accent}22`, padding:'4px 10px', borderRadius:'20px' }}>{t.tagline}</span>
                      </div>
                      <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'19px', fontWeight:700, color:'#e8eaf6', marginBottom:'8px' }}>{t.name}</h3>
                      <p style={{ color:'#6b7280', fontSize:'13.5px', lineHeight:1.65, marginBottom:'20px' }}>{t.desc}</p>
                      {/* Code preview terminal — terminaltrove style */}
                      <div style={{ background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.05)', borderRadius:'10px', padding:'14px 16px' }}>
                        <div style={{ display:'flex', gap:'5px', marginBottom:'10px' }}>
                          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width:'8px', height:'8px', borderRadius:'50%', background:c, opacity:.65 }}/>)}
                        </div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px', color:'#7dd3fc', lineHeight:1.7 }}>
                          {t.href.includes('code') && <><div style={{ color:'#8b85ff' }}>// Business Rule — auto-assign</div><div>{'var gr = new GlideRecord(\'incident\');'}</div><div>{'gr.addQuery(\'state\', 1);'}</div><div>gr.query();</div></>}
                          {t.href.includes('error') && <><div style={{ color:'#f87171' }}>{'// ✗ Error: getValue of null'}</div><div style={{ color:'#4ade80' }}>{'// ✓ Fix: Add null check'}</div><div>{'if (gr.isValidRecord()) {'}</div><div>{'  var v = gr.getValue(\'field\');'}</div><div>{'}'}</div></>}
                          {t.href.includes('cheat') && <><div>gr.addQuery(field, val)</div><div>gr.addEncodedQuery(str)</div><div>gr.orderBy(field)</div><div>gs.getUser().getName()</div><div>g_form.setValue(f, v)</div></>}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'18px', color:t.accent, fontSize:'13px', fontWeight:600 }}>
                        Open tool
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════ SOCIAL PROOF — pageflows/layers.to clean grid ══════ */}
        <section style={{ padding:'100px 24px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div ref={proofRef} style={{ maxWidth:'1000px', margin:'0 auto' }}>
            <p style={{ textAlign:'center', color:'#1e1e2e', fontSize:'11.5px', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', marginBottom:'28px' }}>Trusted at</p>
            <div style={{ display:'flex', justifyContent:'center', gap:'40px', flexWrap:'wrap', marginBottom:'72px', opacity:.3 }}>
              {['Accenture','Deloitte','TCS','Infosys','Wipro','HCL'].map(co => (
                <span key={co} style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'15px', fontWeight:700, color:'#9ca3af', letterSpacing:'.05em' }}>{co}</span>
              ))}
            </div>

            <div style={{ textAlign:'center', marginBottom:'48px' }}>
              <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(26px,3.5vw,38px)', fontWeight:800, letterSpacing:'-.8px', color:'#f0f4ff' }}>
                <WordReveal text="Developers love it" visible={proofVisible} />
              </h2>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'14px' }}>
              {[
                { q:'snspokes cut my spoke setup time in half. The AI search actually understands ServiceNow context.', n:'Priya S.', r:'SN Developer · TCS', av:'PS' },
                { q:'I open the Cheatsheet every morning. The Code Generator handles all the boilerplate I used to write.', n:'James R.', r:'SN Architect · Deloitte', av:'JR' },
                { q:'Error Finder nailed it — told me the exact null check I was missing in 3 seconds.', n:'Arun K.', r:'SN Admin · Infosys', av:'AK' },
              ].map((t,i) => (
                <div key={i}
                  style={{ padding:'24px', background:'rgba(13,13,22,1)', border:'1px solid #1e1e2e', borderRadius:'18px', transition:'all .2s',
                    opacity: proofVisible ? 1 : 0,
                    transform: proofVisible ? 'translateY(0)' : 'translateY(20px)',
                    transitionDelay: `${i*.1}s`,
                  }}
                  onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(108,99,255,.25)';e.currentTarget.style.background='rgba(108,99,255,.04)';e.currentTarget.style.transform='translateY(-3px)';}}
                  onMouseOut={e=>{e.currentTarget.style.borderColor='#1e1e2e';e.currentTarget.style.background='rgba(13,13,22,1)';e.currentTarget.style.transform='translateY(0)';}}>
                  <div style={{ fontSize:'26px', color:'#6c63ff', opacity:.4, marginBottom:'12px', fontFamily:'Georgia,serif' }}>"</div>
                  <p style={{ color:'#9ca3af', fontSize:'14px', lineHeight:1.7, marginBottom:'18px', fontStyle:'italic' }}>{t.q}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#6c63ff,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'#fff', flexShrink:0 }}>{t.av}</div>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#e8eaf6' }}>{t.n}</div>
                      <div style={{ fontSize:'11.5px', color:'#374151', marginTop:'1px' }}>{t.r}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ CTA ══════ */}
        <section style={{ padding:'120px 24px', borderTop:'1px solid rgba(255,255,255,.04)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'600px', height:'300px', background:'radial-gradient(ellipse,rgba(108,99,255,.07) 0%,transparent 70%)', pointerEvents:'none' }} />
          <div style={{ maxWidth:'540px', margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 16px', background:'rgba(108,99,255,.07)', border:'1px solid rgba(108,99,255,.18)', borderRadius:'30px', marginBottom:'28px', fontSize:'12.5px', color:'#8b85ff' }}>
              <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#4ade80', display:'inline-block' }} />
              Free forever — no account required
            </div>
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(30px,4.5vw,50px)', fontWeight:800, lineHeight:1.05, letterSpacing:'-1.5px', color:'#f0f4ff', marginBottom:'16px' }}>
              Stop Googling.<br />
              <span className="gt">Start shipping.</span>
            </h2>
            <p style={{ color:'#4b5563', fontSize:'16px', lineHeight:1.7, marginBottom:'36px' }}>Everything a ServiceNow developer needs, in one place, powered by AI.</p>
            <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
              <Link href="/register" className="cta-pulse" style={{ padding:'15px 34px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', borderRadius:'12px', color:'#fff', fontSize:'15px', fontWeight:700, textDecoration:'none', display:'inline-block', transition:'opacity .15s,transform .15s' }}
                onMouseOver={e=>{e.currentTarget.style.opacity='.9';e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)';}}>
                Get Started Free
              </Link>
              <Link href="/search" style={{ padding:'15px 26px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'12px', color:'#9ca3af', fontSize:'15px', fontWeight:500, textDecoration:'none', display:'inline-block', transition:'all .15s' }}
                onMouseOver={e=>{e.currentTarget.style.background='rgba(255,255,255,.07)';}}
                onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,.04)';}}>
                Try search first →
              </Link>
            </div>
            <p style={{ color:'#1e1e2e', fontSize:'12px', marginTop:'18px' }}>No credit card · No setup · Instant access</p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function ScrollProgress() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setWidth(isNaN(pct) ? 0 : pct);
    };
    window.addEventListener('scroll', update, { passive:true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <div id="scroll-bar" style={{ width: width + '%' }} />;
}
