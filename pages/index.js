export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/* ─── Floating particle ─── */
function Particle({ x, y, size, speed, opacity }) {
  return (
    <div style={{
      position:'absolute', left:`${x}%`, top:`${y}%`,
      width:size, height:size, borderRadius:'50%',
      background:`rgba(108,99,255,${opacity})`,
      animation:`float ${speed}s ease-in-out infinite alternate`,
      pointerEvents:'none',
    }}/>
  );
}

/* ─── Animated number ─── */
function AnimatedNum({ end, suffix='' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      let s = 0; const step = end / 60;
      const iv = setInterval(() => { s += step; if (s >= end) { setVal(end); clearInterval(iv); } else setVal(Math.floor(s)); }, 20);
      obs.disconnect();
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ─── Typewriter ─── */
function Typewriter({ phrases }) {
  const [text, setText] = useState('');
  const [pIdx, setPIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const phrase = phrases[pIdx];
    const t = setTimeout(() => {
      if (!del) {
        setText(phrase.slice(0, charIdx + 1));
        if (charIdx + 1 === phrase.length) setTimeout(() => setDel(true), 1800);
        else setCharIdx(c => c + 1);
      } else {
        setText(phrase.slice(0, charIdx - 1));
        if (charIdx <= 1) { setDel(false); setPIdx(p => (p + 1) % phrases.length); setCharIdx(0); }
        else setCharIdx(c => c - 1);
      }
    }, del ? 25 : 55);
    return () => clearTimeout(t);
  }, [charIdx, del, pIdx, phrases]);
  return <span>{text}<span style={{ borderRight:'2px solid #6c63ff', animation:'blink 1s step-end infinite', marginLeft:'1px' }}>&nbsp;</span></span>;
}

/* ─── Spoke pill ─── */
function SpokePill({ spoke, delay = 0 }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={`/spoke/${spoke.slug}`} style={{ textDecoration:'none' }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 16px',
          background: hov ? spoke.bg : 'rgba(255,255,255,.03)',
          border:`1px solid ${hov ? spoke.color+'55' : 'rgba(255,255,255,.06)'}`,
          borderRadius:'50px', cursor:'pointer', whiteSpace:'nowrap',
          transform: hov ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hov ? `0 8px 24px ${spoke.color}22` : 'none',
          transition:'all .2s cubic-bezier(.22,1,.36,1)',
          animation:`fadeUp .5s ease ${delay}s both`,
        }}>
        <span style={{ fontSize:'15px' }}>{spoke.icon}</span>
        <span style={{ fontSize:'12px', fontWeight:600, color: hov ? '#fff' : '#9ca3af', fontFamily:"'DM Sans',sans-serif" }}>{spoke.name}</span>
      </div>
    </Link>
  );
}

const SPOKES = [
  { slug:'slack',      name:'Slack',      icon:'💬', color:'#4A154B', bg:'rgba(74,21,75,.25)' },
  { slug:'jira',       name:'Jira',       icon:'🔷', color:'#0052CC', bg:'rgba(0,82,204,.2)' },
  { slug:'github',     name:'GitHub',     icon:'🐙', color:'#4ade80', bg:'rgba(74,222,128,.15)' },
  { slug:'aws',        name:'AWS',        icon:'☁️',  color:'#FF9900', bg:'rgba(255,153,0,.18)' },
  { slug:'salesforce', name:'Salesforce', icon:'☁️',  color:'#00A1E0', bg:'rgba(0,161,224,.18)' },
  { slug:'pagerduty',  name:'PagerDuty',  icon:'🚨', color:'#25c151', bg:'rgba(37,193,81,.18)' },
  { slug:'okta',       name:'Okta',       icon:'🔐', color:'#007DC1', bg:'rgba(0,125,193,.18)' },
  { slug:'azure',      name:'Azure',      icon:'🔵', color:'#0078D4', bg:'rgba(0,120,212,.18)' },
  { slug:'microsoft-teams', name:'Teams',icon:'🟦', color:'#5059C9', bg:'rgba(80,89,201,.2)' },
  { slug:'workday',    name:'Workday',    icon:'💼', color:'#F0594D', bg:'rgba(240,89,77,.18)' },
  { slug:'servicenow-cmdb', name:'CMDB', icon:'🗄️', color:'#6c63ff', bg:'rgba(108,99,255,.18)' },
  { slug:'openai',     name:'OpenAI',     icon:'🤖', color:'#10a37f', bg:'rgba(16,163,127,.18)' },
];

const FEATURE_CARDS = [
  {
    icon: '⚡', title: 'Instant Answers',
    desc: 'Search 200+ spokes, API references, and system properties. Results in milliseconds from our database — no AI waiting.',
    accent: '#6c63ff', tag: 'core',
    code: `// GlideRecord query
var gr = new GlideRecord('incident');
gr.addQuery('priority', '1');
gr.query();`,
  },
  {
    icon: '🐛', title: 'Error → Fix',
    desc: 'Paste any ServiceNow error. Get the root cause, exact fix, and what to watch for — pulled from our curated error database.',
    accent: '#f59e0b', tag: 'debug',
    code: `// ✗ INVALID_SESSION_ID
// ✓ OAuth token expired
// Fix: re-authenticate Connection Alias`,
  },
  {
    icon: '💻', title: 'Code Generation',
    desc: 'Describe what you need. Get production-ready Business Rules, Script Includes, and Client Scripts with proper error handling.',
    accent: '#10b981', tag: 'generate',
    code: `// Business Rule — Auto-assign
if (current.operation() === 'insert') {
  current.assigned_to = getAgent();
}`,
  },
  {
    icon: '📡', title: 'Full API Reference',
    desc: '36 APIs documented with methods, parameters, scoped vs global differences, gotchas, and working code examples.',
    accent: '#0ea5e9', tag: 'reference',
    code: `gs.getUser().hasRole('itil');
g_form.setValue('field', val);
RESTMessageV2 → execute()`,
  },
];

const INTENT_OPTIONS = [
  { id:'sn-dev',    icon:'⚙️',  label:'ServiceNow Developer',  hint:'search spokes, APIs, write scripts' },
  { id:'beginner',  icon:'🌱',  label:'Learning ServiceNow',    hint:'start with the basics' },
  { id:'jira',      icon:'🔷',  label:'Jira Admin',             hint:'connect Jira to ServiceNow' },
  { id:'python',    icon:'🐍',  label:'API / Python Dev',       hint:'call ServiceNow REST APIs' },
  { id:'manager',   icon:'📊',  label:'IT Manager',             hint:'understand integrations' },
];

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [q, setQ]           = useState('');
  const [focused, setFocused]= useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending]   = useState([]);
  const [showSugg, setShowSugg]   = useState(false);
  const [intent, setIntent]       = useState('');
  const [showIntent, setShowIntent]= useState(false);
  const [scroll, setScroll]       = useState(0);
  const [stats, setStats]          = useState({ spokes: 50, apis: 36, properties: 76 });
  const [particles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 6 + 4,
      opacity: Math.random() * 0.15 + 0.03,
    }))
  );
  const inputRef = useRef(null);
  const suggRef  = useRef(null);

  // Scroll progress
  useEffect(() => {
    const h = () => {
      const el = document.documentElement;
      setScroll((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100 || 0);
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Fetch trending searches
  useEffect(() => {
    fetch('/api/search?trending=1')
      .then(r => r.json())
      .then(d => setTrending(d.trending || []))
      .catch(() => {});
  }, []);

  // Show intent modal for new visitors
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('sn_intent')) {
      setTimeout(() => setShowIntent(true), 2000);
    }
  }, []);

  // Autocomplete suggestions
  useEffect(() => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/search?suggest=1&q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => setSuggestions(d.suggestions || []))
        .catch(() => {});
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  const go = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}${intent ? `&ctx=${intent}` : ''}`);
  };

  const pickSuggestion = (s) => {
    setQ(s);
    setShowSugg(false);
    router.push(`/search?q=${encodeURIComponent(s)}${intent ? `&ctx=${intent}` : ''}`);
  };

  const saveIntent = (id) => {
    setIntent(id);
    localStorage.setItem('sn_intent', id);
    setShowIntent(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const h = (e) => { if (suggRef.current && !suggRef.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const currentIntent = INTENT_OPTIONS.find(o => o.id === intent);

  return (
    <>
      <Head>
        <title>snspokes — ServiceNow Developer Intelligence</title>
        <meta name="description" content="The fastest way to search ServiceNow Integration Hub spokes, APIs, and docs. Get instant answers with working code." />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes blink      { 0%,100%{opacity:1}50%{opacity:0} }
          @keyframes fadeUp     { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
          @keyframes float      { from{transform:translateY(0)}to{transform:translateY(-12px)} }
          @keyframes gradShift  { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
          @keyframes pulseRing  { 0%{box-shadow:0 0 0 0 rgba(108,99,255,.35)}70%{box-shadow:0 0 0 16px rgba(108,99,255,0)}100%{box-shadow:0 0 0 0 rgba(108,99,255,0)} }
          @keyframes slideIn    { from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)} }
          @keyframes scaleIn    { from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)} }
          @keyframes ticker     { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }

          .fu { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) both; }
          .d1{animation-delay:.08s}.d2{animation-delay:.16s}.d3{animation-delay:.24s}.d4{animation-delay:.32s}.d5{animation-delay:.44s}

          .gt {
            background: linear-gradient(135deg, #fff 0%, #a78bfa 40%, #6c63ff 100%);
            background-size: 200% 200%;
            animation: gradShift 4s ease infinite;
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          }

          .hero-glow {
            background: radial-gradient(ellipse at 30% 40%, rgba(108,99,255,.18) 0%, transparent 55%),
                        radial-gradient(ellipse at 70% 60%, rgba(168,85,247,.12) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 10%, rgba(56,189,248,.08) 0%, transparent 40%),
                        #040407;
          }

          .glass-card {
            background: rgba(255,255,255,.03);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,.07);
          }
          .glass-card:hover {
            background: rgba(255,255,255,.05);
            border-color: rgba(108,99,255,.3);
            transform: translateY(-4px);
            box-shadow: 0 20px 60px rgba(0,0,0,.4), 0 0 0 1px rgba(108,99,255,.15);
          }
          .glass-card { transition: all .25s cubic-bezier(.22,1,.36,1); }

          .search-input:focus-within {
            border-color: rgba(108,99,255,.6) !important;
            box-shadow: 0 0 0 4px rgba(108,99,255,.12), 0 20px 60px rgba(0,0,0,.5) !important;
          }

          .cta-btn {
            background: linear-gradient(135deg, #6c63ff, #a855f7);
            animation: pulseRing 2.5s cubic-bezier(.66,0,0,1) infinite;
          }
          .cta-btn:hover { opacity:.9; transform:translateY(-2px); box-shadow:0 12px 40px rgba(108,99,255,.4) !important; }
          .cta-btn { transition: all .2s ease; }

          .feature-code {
            background: #020208;
            border: 1px solid rgba(255,255,255,.06);
            border-radius: 8px;
            padding: 12px 14px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            color: #7dd3fc;
            line-height: 1.7;
            white-space: pre;
            overflow-x: auto;
          }

          .ticker-inner { animation: ticker 32s linear infinite; }
          .ticker-inner:hover { animation-play-state: paused; }
          .ticker-wrap { overflow:hidden; mask-image:linear-gradient(to right,transparent,black 6%,black 94%,transparent); }

          #scroll-bar { position:fixed;top:0;left:0;height:2px;background:linear-gradient(to right,#6c63ff,#a855f7);z-index:9999;pointer-events:none;transition:width .1s; }

          .intent-card:hover { background:rgba(108,99,255,.1)!important; border-color:rgba(108,99,255,.4)!important; transform:translateY(-2px); }
          .intent-card { transition:all .15s cubic-bezier(.22,1,.36,1); }

          .sugg-item:hover { background:rgba(108,99,255,.1)!important; }
          .sugg-item { transition:background .1s; }
        `}</style>
      </Head>

      {/* Scroll progress */}
      <div id="scroll-bar" style={{ width: scroll + '%' }} />

      {/* Intent modal */}
      {showIntent && (
        <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'#0a0a14', border:'1px solid rgba(108,99,255,.25)', borderRadius:'20px', padding:'32px', maxWidth:'480px', width:'100%', animation:'scaleIn .3s ease both', boxShadow:'0 40px 100px rgba(0,0,0,.7)' }}>
            <div style={{ textAlign:'center', marginBottom:'28px' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>👋</div>
              <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'22px', fontWeight:800, color:'#f0f4ff', marginBottom:'8px' }}>
                What brings you here?
              </h2>
              <p style={{ color:'#6b7280', fontSize:'14px', fontFamily:"'DM Sans',sans-serif" }}>
                We personalize your experience based on who you are
              </p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {INTENT_OPTIONS.map(o => (
                <button key={o.id} onClick={() => saveIntent(o.id)} className="intent-card"
                  style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'12px', cursor:'pointer', textAlign:'left', width:'100%' }}>
                  <span style={{ fontSize:'22px', flexShrink:0 }}>{o.icon}</span>
                  <div>
                    <div style={{ color:'#e2e8f0', fontSize:'14px', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>{o.label}</div>
                    <div style={{ color:'#4b5563', fontSize:'12px', fontFamily:"'JetBrains Mono',monospace" }}>{o.hint}</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowIntent(false)} style={{ display:'block', width:'100%', marginTop:'16px', background:'none', border:'none', color:'#374151', fontSize:'12px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
              skip for now
            </button>
          </div>
        </div>
      )}

      <Navbar />

      <main style={{ background:'#040407', color:'#e8eaf6', fontFamily:"'DM Sans',sans-serif", overflowX:'hidden' }}>

        {/* ══════ HERO ══════ */}
        <section className="hero-glow" style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'120px 24px 80px', position:'relative', overflow:'hidden' }}>

          {/* Animated particles */}
          <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
            {particles.map((p, i) => <Particle key={i} {...p} />)}
          </div>

          {/* Grid overlay */}
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(108,99,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,.025) 1px,transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }} />

          <div style={{ maxWidth:'800px', width:'100%', textAlign:'center', position:'relative', zIndex:1 }}>

            {/* Badge */}
            <div className="fu d1" style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 16px', background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.2)', borderRadius:'50px', marginBottom:'32px', fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px', color:'#8b85ff' }}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80', animation:'blink 2s infinite' }} />
              200+ ServiceNow Integration Hub Spokes · Now with Full-Text Search
            </div>

            {/* Headline */}
            <h1 className="fu d2" style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(38px,6.5vw,72px)', fontWeight:800, lineHeight:1.03, letterSpacing:'-2.5px', marginBottom:'20px', color:'#f0f4ff' }}>
              The developer tool<br/>
              <span className="gt">ServiceNow deserves</span>
            </h1>

            {/* Animated subtitle */}
            <p className="fu d3" style={{ fontSize:'20px', color:'#6b7280', lineHeight:1.6, maxWidth:'520px', margin:'0 auto 48px', minHeight:'32px' }}>
              <Typewriter phrases={[
                'Search 200+ spokes instantly',
                'Fix errors in seconds',
                'Generate production code',
                'Browse the full API reference',
                'Never read the docs again',
              ]} />
            </p>

            {/* Search bar */}
            <div className="fu d4" ref={suggRef} style={{ position:'relative', maxWidth:'640px', margin:'0 auto' }}>
              <form onSubmit={go}>
                <div className="search-input" style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px', background:'rgba(255,255,255,.04)', borderRadius:'16px', border:'1px solid rgba(255,255,255,.08)', boxShadow:'0 8px 32px rgba(0,0,0,.4)', backdropFilter:'blur(20px)', transition:'border-color .2s, box-shadow .2s' }}>
                  <div style={{ paddingLeft:'10px', flexShrink:0 }}>
                    <svg width="16" height="16" fill="none" stroke="#4b5563" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setShowSugg(true); }}
                    onFocus={() => setShowSugg(true)}
                    placeholder="Search spokes, APIs, errors, code patterns..."
                    style={{ flex:1, background:'none', border:'none', outline:'none', color:'#e8eaf6', fontSize:'15.5px', fontFamily:"'DM Sans',sans-serif", padding:'12px 8px', minWidth:0 }}
                    autoFocus />
                  {/* Context badge */}
                  {currentIntent && (
                    <button type="button" onClick={() => setShowIntent(true)}
                      style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'5px', padding:'5px 10px', background:'rgba(108,99,255,.12)', border:'1px solid rgba(108,99,255,.2)', borderRadius:'8px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace", fontSize:'10.5px', color:'#8b85ff' }}>
                      {currentIntent.icon} {currentIntent.label}
                    </button>
                  )}
                  <button type="submit" className="cta-btn" style={{ flexShrink:0, padding:'12px 24px', border:'none', borderRadius:'10px', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
                    Search →
                  </button>
                </div>
              </form>

              {/* Suggestions dropdown */}
              {showSugg && (suggestions.length > 0 || trending.length > 0) && (
                <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, right:0, background:'#06060e', border:'1px solid rgba(255,255,255,.08)', borderRadius:'14px', overflow:'hidden', zIndex:500, boxShadow:'0 20px 60px rgba(0,0,0,.6)' }}>
                  {suggestions.length > 0 && (
                    <div style={{ padding:'8px' }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#2a2a3a', padding:'4px 8px', letterSpacing:'1px' }}>SUGGESTIONS</div>
                      {suggestions.slice(0,5).map((s, i) => (
                        <button key={i} onClick={() => pickSuggestion(s.name || s)} className="sugg-item"
                          style={{ display:'flex', alignItems:'center', gap:'10px', width:'100%', padding:'8px 10px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', borderRadius:'8px' }}>
                          <span style={{ fontSize:'15px' }}>{s.icon || '🔍'}</span>
                          <span style={{ color:'#e2e8f0', fontSize:'13.5px', fontFamily:"'DM Sans',sans-serif" }}>{s.name || s}</span>
                          <span style={{ marginLeft:'auto', fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#374151' }}>{s.type || 'search'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {trending.length > 0 && suggestions.length === 0 && (
                    <div style={{ padding:'8px' }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#2a2a3a', padding:'4px 8px', letterSpacing:'1px' }}>🔥 TRENDING</div>
                      {trending.slice(0,5).map((t, i) => (
                        <button key={i} onClick={() => pickSuggestion(t.query)} className="sugg-item"
                          style={{ display:'flex', alignItems:'center', gap:'10px', width:'100%', padding:'8px 10px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', borderRadius:'8px' }}>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#6c63ff', minWidth:'16px' }}>#{i+1}</span>
                          <span style={{ color:'#9ca3af', fontSize:'13px', fontFamily:"'DM Sans',sans-serif" }}>{t.query}</span>
                          <span style={{ marginLeft:'auto', fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#374151' }}>{t.count}×</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ padding:'8px 12px 10px', borderTop:'1px solid #0d0d18', display:'flex', gap:'6px', flexWrap:'wrap' }}>
                    {['GlideRecord query', 'Slack OAuth setup', 'ACL error fix'].map(ex => (
                      <button key={ex} onClick={() => pickSuggestion(ex)}
                        style={{ padding:'4px 10px', background:'rgba(108,99,255,.06)', border:'1px solid rgba(108,99,255,.12)', borderRadius:'20px', color:'#8b85ff', fontSize:'11px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="fu d5" style={{ display:'flex', gap:'48px', justifyContent:'center', marginTop:'56px', flexWrap:'wrap' }}>
              {[
                { v:stats.spokes, s:'+', l:'Spokes indexed', icon:'🔌' },
                { v:36,  s:'',  l:'API references', icon:'📡' },
                { v:76,  s:'',  l:'System properties', icon:'⚙️' },
              ].map(st => (
                <div key={st.l} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'32px', fontWeight:800, color:'#f0f4ff', lineHeight:1 }}>{st.icon} <AnimatedNum end={st.v} suffix={st.s} /></div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginTop:'5px', letterSpacing:'1px' }}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ SPOKE TICKER ══════ */}
        <section style={{ borderTop:'1px solid rgba(255,255,255,.04)', padding:'36px 0' }}>
          <p style={{ textAlign:'center', fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#1e1e2e', letterSpacing:'2.5px', marginBottom:'20px' }}>POPULAR INTEGRATION HUB SPOKES</p>
          <div className="ticker-wrap">
            <div className="ticker-inner" style={{ display:'inline-flex', gap:0, width:'max-content' }}>
              {[...SPOKES, ...SPOKES].map((s, i) => <SpokePill key={i} spoke={s} />)}
            </div>
          </div>
        </section>

        {/* ══════ FEATURE GRID ══════ */}
        <section style={{ padding:'100px 24px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:'64px' }}>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#6c63ff', letterSpacing:'3px', marginBottom:'14px' }}>// WHAT_YOU_GET</p>
              <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(28px,4vw,44px)', fontWeight:800, letterSpacing:'-1.5px', color:'#f0f4ff', lineHeight:1.1 }}>
                Everything in one place.<br/><span className="gt">Nothing to install.</span>
              </h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'14px' }}>
              {FEATURE_CARDS.map((f, i) => {
                const rgb = f.accent === '#6c63ff' ? '108,99,255' : f.accent === '#f59e0b' ? '245,158,11' : f.accent === '#10b981' ? '16,185,129' : '14,165,233';
                return (
                  <div key={f.title} className="glass-card" style={{ padding:'24px', borderRadius:'20px', position:'relative', overflow:'hidden',
                    opacity:0, animation:`fadeUp .6s ease ${.1 + i*.1}s both` }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:'1.5px', background:`linear-gradient(to right,transparent,${f.accent}70,transparent)` }} />
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
                      <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:`rgba(${rgb},.12)`, border:`1px solid rgba(${rgb},.2)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>{f.icon}</div>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:f.accent, background:`rgba(${rgb},.08)`, border:`1px solid rgba(${rgb},.15)`, padding:'3px 8px', borderRadius:'4px' }}>{f.tag}</span>
                    </div>
                    <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'17px', fontWeight:700, color:'#e8eaf6', marginBottom:'8px' }}>{f.title}</h3>
                    <p style={{ color:'#6b7280', fontSize:'13.5px', lineHeight:1.6, marginBottom:'16px' }}>{f.desc}</p>
                    <div className="feature-code">{f.code}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════ SOCIAL PROOF ══════ */}
        <section style={{ padding:'80px 24px', borderTop:'1px solid rgba(255,255,255,.04)', background:'rgba(108,99,255,.02)' }}>
          <div style={{ maxWidth:'960px', margin:'0 auto', textAlign:'center' }}>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', letterSpacing:'2px', marginBottom:'40px' }}>USED BY DEVELOPERS AT</p>
            <div style={{ display:'flex', justifyContent:'center', gap:'48px', flexWrap:'wrap', marginBottom:'60px' }}>
              {['Accenture','Deloitte','TCS','Infosys','Wipro','HCL','IBM','Capgemini'].map(co => (
                <span key={co} style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'14px', fontWeight:700, color:'#1e1e2e', letterSpacing:'.05em' }}>{co}</span>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'14px' }}>
              {[
                { q:'snspokes replaced 3 browser tabs I had permanently open. Search is instant.', n:'Priya S.', r:'SN Developer · TCS', av:'PS', stars:5 },
                { q:'Error Finder told me the exact null check I was missing in 3 seconds. Saved my afternoon.', n:'James R.', r:'SN Architect · Deloitte', av:'JR', stars:5 },
                { q:'The API reference with scoped vs global differences — I\'ve been looking for this for years.', n:'Arun K.', r:'SN Admin · Infosys', av:'AK', stars:5 },
              ].map((t, i) => (
                <div key={i} className="glass-card" style={{ padding:'22px', borderRadius:'16px', textAlign:'left', animation:`fadeUp .6s ease ${.1+i*.1}s both`, opacity:0 }}>
                  <div style={{ display:'flex', gap:'2px', marginBottom:'12px' }}>{Array(t.stars).fill(0).map((_,j) => <span key={j} style={{ color:'#f59e0b', fontSize:'13px' }}>★</span>)}</div>
                  <p style={{ color:'#9ca3af', fontSize:'13.5px', lineHeight:1.7, marginBottom:'16px', fontStyle:'italic' }}>"{t.q}"</p>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#6c63ff,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'#fff', flexShrink:0 }}>{t.av}</div>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#e8eaf6' }}>{t.n}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#2a2a3a' }}>{t.r}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ CTA ══════ */}
        <section style={{ padding:'120px 24px', borderTop:'1px solid rgba(255,255,255,.04)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'600px', height:'300px', background:'radial-gradient(ellipse,rgba(108,99,255,.1) 0%,transparent 70%)', pointerEvents:'none' }} />
          <div style={{ maxWidth:'560px', margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 16px', background:'rgba(74,222,128,.07)', border:'1px solid rgba(74,222,128,.2)', borderRadius:'50px', marginBottom:'28px', fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#4ade80' }}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80', animation:'blink 2s infinite' }} />
              Free forever · No credit card · Instant access
            </div>
            <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'clamp(32px,5vw,52px)', fontWeight:800, lineHeight:1.05, letterSpacing:'-2px', color:'#f0f4ff', marginBottom:'16px' }}>
              Stop Googling.<br/><span className="gt">Start shipping.</span>
            </h2>
            <p style={{ color:'#4b5563', fontSize:'17px', lineHeight:1.7, marginBottom:'36px' }}>
              Join thousands of ServiceNow developers who moved here from 5 browser tabs.
            </p>
            <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
              <Link href="/search" className="cta-btn" style={{ padding:'15px 36px', borderRadius:'12px', color:'#fff', fontSize:'15.5px', fontWeight:700, textDecoration:'none', display:'inline-block', fontFamily:"'DM Sans',sans-serif" }}>
                Start Searching Free
              </Link>
              <Link href="/api-reference" style={{ padding:'15px 24px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'12px', color:'#9ca3af', fontSize:'15.5px', textDecoration:'none', display:'inline-block', transition:'all .15s' }}
                onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,.07)'}
                onMouseOut={e  => e.currentTarget.style.background='rgba(255,255,255,.04)'}>
                Browse API Docs →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
