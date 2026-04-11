import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const SPOKES = [
  { slug:'slack',           name:'Slack',       icon:'💬', color:'#4A154B', bg:'rgba(74,21,75,0.15)' },
  { slug:'jira',            name:'Jira',        icon:'🔷', color:'#0052CC', bg:'rgba(0,82,204,0.15)' },
  { slug:'microsoft-teams', name:'Teams',       icon:'🟦', color:'#5059C9', bg:'rgba(80,89,201,0.15)' },
  { slug:'github',          name:'GitHub',      icon:'🐙', color:'#4ade80', bg:'rgba(74,222,128,0.1)' },
  { slug:'aws',             name:'AWS',         icon:'☁️', color:'#FF9900', bg:'rgba(255,153,0,0.12)' },
  { slug:'pagerduty',       name:'PagerDuty',   icon:'🚨', color:'#25c151', bg:'rgba(37,193,81,0.12)' },
  { slug:'salesforce',      name:'Salesforce',  icon:'☁️', color:'#00A1E0', bg:'rgba(0,161,224,0.12)' },
  { slug:'okta',            name:'Okta',        icon:'🔐', color:'#007DC1', bg:'rgba(0,125,193,0.12)' },
];

const TOOLS = [
  {
    href: '/tools/code-generator',
    icon: '💻',
    name: 'Code Generator',
    tagline: 'Write zero code',
    desc: 'Describe what you need — Business Rules, Script Includes, Client Scripts — and get production-ready ServiceNow code instantly.',
    accent: '#6366f1',
    glow: 'rgba(99,102,241,0.2)',
    preview: 'var gr = new GlideRecord(\'incident\');\ngr.addQuery(\'state\', 1);\ngr.query();\nwhile (gr.next()) {\n  gs.log(gr.number);\n}',
  },
  {
    href: '/tools/error-finder',
    icon: '🐛',
    name: 'Error Finder',
    tagline: 'Debug in seconds',
    desc: 'Paste any ServiceNow error. Get the root cause, the exact line, and a working fix — no Stack Overflow required.',
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.18)',
    preview: '// Error: Cannot read property\n// getValue of null\n\n// Fix: Add null check\nif (gr.isValidRecord()) {\n  var val = gr.getValue(\'field\');\n}',
  },
  {
    href: '/tools/cheatsheet',
    icon: '📖',
    name: 'Cheatsheet',
    tagline: 'Never Google again',
    desc: 'Every GlideRecord, gs, g_form, and Flow Designer method on one page. Searchable, fast, always available.',
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.18)',
    preview: 'gr.addQuery(field, value)\ngr.addEncodedQuery(str)\ngr.orderBy(field)\ngr.setLimit(100)\ngs.getUser().getName()\ng_form.setValue(field, val)',
  },
];

const STEPS = [
  { n:'01', title:'Search any spoke or topic', desc:'Type a question like "How do I configure Slack OAuth?" and get an instant AI answer with real code examples.', icon:'🔍' },
  { n:'02', title:'Generate or debug code', desc:'Use Code Generator to build scripts from scratch, or drop an error into Error Finder and get an exact fix.', icon:'⚡' },
  { n:'03', title:'Ship faster every day', desc:'Reference the Cheatsheet, browse 200+ spoke docs, and never context-switch out of your flow again.', icon:'🚀' },
];

const TESTIMONIALS = [
  { q:'snspokes cut my spoke setup time in half. The AI search actually understands ServiceNow context.', name:'Priya S.', role:'SN Developer · TCS', avatar:'PS' },
  { q:'I use the Cheatsheet every single day. The Code Generator saves me from writing boilerplate forever.', name:'James R.', role:'SN Architect · Deloitte', avatar:'JR' },
  { q:'Error Finder alone is worth it. Told me the exact null check I was missing in seconds.', name:'Arun K.', role:'SN Admin · Infosys', avatar:'AK' },
];

function useTypewriter(phrases, speed, pause) {
  if (!speed) speed = 55;
  if (!pause) pause = 2200;
  const [text, setText] = useState('');
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    var phrase = phrases[idx];
    var timer = setTimeout(function() {
      if (!deleting) {
        setText(phrase.slice(0, charIdx + 1));
        if (charIdx + 1 === phrase.length) setTimeout(function() { setDeleting(true); }, pause);
        else setCharIdx(function(c) { return c + 1; });
      } else {
        setText(phrase.slice(0, charIdx));
        if (charIdx === 0) { setDeleting(false); setIdx(function(i) { return (i + 1) % phrases.length; }); }
        else setCharIdx(function(c) { return c - 1; });
      }
    }, deleting ? 22 : speed);
    return function() { clearTimeout(timer); };
  }, [charIdx, deleting, idx]);
  return text;
}

function Counter(props) {
  var end = props.end;
  var suffix = props.suffix || '';
  var duration = props.duration || 2000;
  var [val, setVal] = useState(0);
  var ref = useRef(null);
  useEffect(function() {
    var observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        var start = 0;
        var step = end / (duration / 16);
        var timer = setInterval(function() {
          start += step;
          if (start >= end) { setVal(end); clearInterval(timer); }
          else setVal(Math.floor(start));
        }, 16);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return function() { observer.disconnect(); };
  }, []);
  return React.createElement('span', { ref: ref }, val.toLocaleString() + suffix);
}

export default function Home() {
  var router = useRouter();
  var [searchQ, setSearchQ] = useState('');
  var [focused, setFocused] = useState(false);
  var typed = useTypewriter([
    'How do I set up Slack OAuth in ServiceNow?',
    'GlideRecord query with multiple conditions...',
    'Error: ACL restriction prevented read...',
    'Flow Designer REST step best practices...',
  ]);

  var handleSearch = function(e) {
    e.preventDefault();
    if (searchQ.trim()) router.push('/search?q=' + encodeURIComponent(searchQ));
  };

  return (
    <>
      <Head>
        <title>snspokes — The ServiceNow Developer Toolkit</title>
        <meta name="description" content="AI-powered search, code generation, and documentation for 200+ ServiceNow Integration Hub spokes. Built for developers who ship fast." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; }
          body { font-family: 'DM Sans', sans-serif; }
          .snf { font-family: 'Bricolage Grotesque', sans-serif; }
          .snm { font-family: 'JetBrains Mono', monospace; }
          @keyframes snfu { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
          @keyframes snaurora { 0%,100% { transform:translate(0,0) rotate(0); } 33% { transform:translate(30px,-20px) rotate(3deg); } 66% { transform:translate(-20px,15px) rotate(-2deg); } }
          @keyframes snshimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
          @keyframes snticker { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
          @keyframes sndot { 0%,100% { opacity:1; } 50% { opacity:0.25; } }
          .snfu { animation: snfu .65s ease both; }
          .snd1 { animation-delay:.05s; } .snd2 { animation-delay:.15s; } .snd3 { animation-delay:.25s; } .snd4 { animation-delay:.35s; } .snd5 { animation-delay:.48s; }
          .sngt { background:linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#38bdf8 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
          .snsht { background:linear-gradient(90deg,#818cf8,#c084fc,#38bdf8,#818cf8); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:snshimmer 4s linear infinite; }
          .sncard { transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease, background .2s ease; }
          .sncard:hover { transform:translateY(-3px); }
          .snswrap { transition:box-shadow .25s ease, border-color .25s ease; }
          .snsfoc { box-shadow:0 0 0 1px rgba(99,102,241,.45),0 8px 40px rgba(99,102,241,.12),0 20px 60px rgba(0,0,0,.5)!important; border-color:rgba(99,102,241,.4)!important; }
          .snticker-wrap { overflow:hidden; mask-image:linear-gradient(to right,transparent 0%,black 10%,black 90%,transparent 100%); }
          .snticker-inner { display:inline-flex; gap:0; animation:snticker 32s linear infinite; width:max-content; }
          .snspk { transition:all .2s ease; }
          .snspk:hover { transform:translateY(-2px) scale(1.02); }
          .snbtnp { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; padding:15px 34px; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:opacity .15s,transform .15s,box-shadow .15s; text-decoration:none; display:inline-block; }
          .snbtnp:hover { opacity:.9; transform:translateY(-1px); box-shadow:0 8px 24px rgba(99,102,241,.35); }
          .snbtng { background:rgba(255,255,255,.04); color:#a8b2d8; border:1px solid rgba(255,255,255,.08); padding:15px 26px; border-radius:12px; font-size:15px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:background .15s,border-color .15s; text-decoration:none; display:inline-block; }
          .snbtng:hover { background:rgba(255,255,255,.07); border-color:rgba(255,255,255,.15); }
          .snavi { width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6); display:flex; align-items:center; justify-content:center; font-size:11.5px; font-weight:700; color:#fff; flex-shrink:0; }
        `}</style>
      </Head>
      <Navbar />
      <main style={{ background:'#040407', color:'#e8eaf6', minHeight:'100vh', overflowX:'hidden' }}>

        {/* HERO */}
        <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'140px 24px 100px', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:'-10%', left:'-5%', width:'600px', height:'600px', background:'radial-gradient(ellipse, rgba(99,102,241,.08) 0%, transparent 70%)', animation:'snaurora 18s ease-in-out infinite', borderRadius:'50%' }} />
            <div style={{ position:'absolute', bottom:'-15%', right:'-5%', width:'500px', height:'500px', background:'radial-gradient(ellipse, rgba(139,92,246,.07) 0%, transparent 70%)', animation:'snaurora 22s ease-in-out infinite reverse', borderRadius:'50%' }} />
            <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)', width:'800px', height:'400px', background:'radial-gradient(ellipse, rgba(56,189,248,.04) 0%, transparent 60%)', animation:'snaurora 15s ease-in-out infinite 5s', borderRadius:'50%' }} />
            <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize:'40px 40px', maskImage:'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)' }} />
          </div>
          <div style={{ maxWidth:'780px', width:'100%', textAlign:'center', position:'relative', zIndex:1 }}>
            <div className="snfu snd1" style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 16px', background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.18)', borderRadius:'30px', marginBottom:'32px', fontSize:'12.5px', color:'#a5b4fc', fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>
              <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#4ade80', display:'inline-block', animation:'sndot 2s infinite' }} />
              Free forever · No credit card
              <span style={{ width:'1px', height:'12px', background:'rgba(165,180,252,.2)', margin:'0 2px' }} />
              <span style={{ color:'#c084fc' }}>200+ spokes</span>
            </div>
            <h1 className="snfu snd2 snf" style={{ fontSize:'clamp(38px,6vw,68px)', fontWeight:800, lineHeight:1.05, letterSpacing:'-2px', marginBottom:'22px', color:'#f0f4ff' }}>
              The toolkit every<br />
              <span className="sngt">ServiceNow developer</span><br />
              actually needs
            </h1>
            <p className="snfu snd3" style={{ color:'#6b7280', fontSize:'18px', lineHeight:1.75, maxWidth:'520px', margin:'0 auto 44px', fontWeight:400 }}>
              AI search across 200+ Integration Hub spokes, instant code generation, and a debug tool that finds your error before you finish reading the stack trace.
            </p>
            <form onSubmit={handleSearch} className="snfu snd4">
              <div className={'snswrap' + (focused ? ' snsfoc' : '')} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px', maxWidth:'620px', margin:'0 auto', borderRadius:'20px', background:'rgba(13,13,22,.9)', border:'1px solid rgba(255,255,255,.07)', backdropFilter:'blur(24px)', boxShadow:'0 8px 40px rgba(0,0,0,.5)' }}>
                <div style={{ paddingLeft:'14px', display:'flex', alignItems:'center', flexShrink:0 }}>
                  <svg width="17" height="17" fill="none" stroke="#4b5563" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input
                  value={searchQ}
                  onChange={function(e) { setSearchQ(e.target.value); }}
                  onFocus={function() { setFocused(true); }}
                  onBlur={function() { setFocused(false); }}
                  placeholder={searchQ ? '' : (typed || 'Ask anything about ServiceNow...')}
                  style={{ flex:1, background:'none', border:'none', outline:'none', color:'#e8eaf6', fontSize:'15px', fontFamily:"'DM Sans',sans-serif", padding:'13px 8px' }}
                />
                <button type="submit" style={{ flexShrink:0, padding:'13px 26px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'14px', color:'#fff', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
                  Search →
                </button>
              </div>
              <div style={{ display:'flex', justifyContent:'center', gap:'10px', marginTop:'16px', flexWrap:'wrap' }}>
                {['Slack OAuth setup', 'GlideRecord query', 'ACL restriction error'].map(function(q) {
                  return (
                    <button key={q} type="button"
                      onClick={function() { setSearchQ(q); router.push('/search?q=' + encodeURIComponent(q)); }}
                      onMouseOver={function(e) { e.currentTarget.style.color='#a5b4fc'; e.currentTarget.style.borderColor='rgba(165,180,252,.3)'; }}
                      onMouseOut={function(e) { e.currentTarget.style.color='#6b7280'; e.currentTarget.style.borderColor='rgba(255,255,255,.07)'; }}
                      style={{ padding:'5px 13px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'20px', color:'#6b7280', fontSize:'12.5px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'color .15s,border-color .15s' }}>
                      {q}
                    </button>
                  );
                })}
              </div>
            </form>
            <div className="snfu snd5" style={{ display:'flex', gap:'48px', justifyContent:'center', marginTop:'60px', flexWrap:'wrap' }}>
              {[{v:200,s:'+',l:'Integration Spokes'},{v:3,s:'',l:'AI-Powered Tools'},{v:100,s:'%',l:'Free to Use'}].map(function(st) {
                return (
                  <div key={st.l} style={{ textAlign:'center' }}>
                    <div className="snf" style={{ fontSize:'32px', fontWeight:800, color:'#f0f4ff', lineHeight:1 }}>
                      <Counter end={st.v} suffix={st.s} />
                    </div>
                    <div style={{ fontSize:'12px', color:'#4b5563', marginTop:'5px', fontWeight:500 }}>{st.l}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SPOKE TICKER */}
        <section style={{ padding:'0 0 80px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <p style={{ textAlign:'center', color:'#374151', fontSize:'11.5px', fontWeight:600, textTransform:'uppercase', letterSpacing:'2px', margin:'0 0 28px', paddingTop:'52px' }}>Popular Integration Hub Spokes</p>
          <div className="snticker-wrap">
            <div className="snticker-inner">
              {[...SPOKES, ...SPOKES].map(function(s, i) {
                return (
                  <Link key={s.slug + '-' + i} href={'/spoke/' + s.slug} style={{ textDecoration:'none', flexShrink:0 }}>
                    <div className="snspk" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 22px', margin:'0 6px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:'50px', cursor:'pointer', whiteSpace:'nowrap' }}
                      onMouseOver={function(e) { e.currentTarget.style.background=s.bg; e.currentTarget.style.borderColor=s.color+'50'; }}
                      onMouseOut={function(e) { e.currentTarget.style.background='rgba(255,255,255,.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,.06)'; }}>
                      <span style={{ fontSize:'17px' }}>{s.icon}</span>
                      <span style={{ fontSize:'13.5px', fontWeight:600, color:'#c9d1e8' }}>{s.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          <div style={{ textAlign:'center', marginTop:'28px' }}>
            <Link href="/spokes" style={{ color:'#6366f1', fontSize:'13px', fontWeight:600, textDecoration:'none', padding:'8px 20px', border:'1px solid rgba(99,102,241,.2)', borderRadius:'20px' }}>View all 200+ spokes →</Link>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding:'100px 24px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div style={{ maxWidth:'1000px', margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:'64px' }}>
              <p style={{ color:'#6366f1', fontSize:'12px', fontWeight:700, textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>How it works</p>
              <h2 className="snf" style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:800, letterSpacing:'-1px', color:'#f0f4ff', lineHeight:1.1 }}>
                From question to <span className="sngt">shipped code</span> in minutes
              </h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'2px' }}>
              {STEPS.map(function(step, i) {
                return (
                  <div key={i} style={{ padding:'36px 32px', background: i===1 ? 'rgba(99,102,241,.05)' : 'rgba(255,255,255,.015)', border:'1px solid rgba(255,255,255,.05)', borderRadius: i===0 ? '20px 0 0 20px' : i===2 ? '0 20px 20px 0' : '0', position:'relative', overflow:'hidden' }}>
                    {i===1 && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(to right,transparent,#6366f1,transparent)' }} />}
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'16px', marginBottom:'16px' }}>
                      <span className="snm" style={{ fontSize:'11px', color:'#374151', fontWeight:600, paddingTop:'2px', flexShrink:0 }}>{step.n}</span>
                      <div style={{ width:'40px', height:'40px', background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.12)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>{step.icon}</div>
                    </div>
                    <h3 className="snf" style={{ fontSize:'17px', fontWeight:700, color:'#e8eaf6', marginBottom:'10px', letterSpacing:'-0.3px' }}>{step.title}</h3>
                    <p style={{ color:'#6b7280', fontSize:'13.5px', lineHeight:1.65 }}>{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* TOOLS */}
        <section style={{ padding:'100px 24px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:'64px' }}>
              <p style={{ color:'#6366f1', fontSize:'12px', fontWeight:700, textTransform:'uppercase', letterSpacing:'2.5px', marginBottom:'12px' }}>Power Tools</p>
              <h2 className="snf" style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:800, letterSpacing:'-1px', color:'#f0f4ff', lineHeight:1.1 }}>
                Built for devs who <span className="snsht">hate wasting time</span>
              </h2>
              <p style={{ color:'#6b7280', fontSize:'16px', maxWidth:'440px', margin:'16px auto 0', lineHeight:1.6 }}>Three tools, each solving a real problem every ServiceNow developer faces daily.</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(310px, 1fr))', gap:'16px' }}>
              {TOOLS.map(function(t, i) {
                var rgb = t.accent === '#6366f1' ? '99,102,241' : t.accent === '#f59e0b' ? '245,158,11' : '16,185,129';
                return (
                  <Link key={t.href} href={t.href} style={{ textDecoration:'none' }}>
                    <div className="sncard"
                      onMouseOver={function(e) { e.currentTarget.style.background='rgba('+rgb+',.05)'; e.currentTarget.style.borderColor=t.accent+'30'; e.currentTarget.style.boxShadow='0 12px 40px '+t.glow; }}
                      onMouseOut={function(e) { e.currentTarget.style.background='rgba(255,255,255,.02)'; e.currentTarget.style.borderColor='rgba(255,255,255,.06)'; e.currentTarget.style.boxShadow='none'; }}
                      style={{ padding:'28px', borderRadius:'20px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', cursor:'pointer', height:'100%', position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px', background:'linear-gradient(to right,transparent,'+t.accent+'60,transparent)' }} />
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
                        <div style={{ width:'46px', height:'46px', borderRadius:'12px', background:t.accent+'12', border:'1px solid '+t.accent+'25', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>{t.icon}</div>
                        <span style={{ fontSize:'11px', fontWeight:600, color:t.accent, background:t.accent+'10', padding:'4px 10px', borderRadius:'20px', border:'1px solid '+t.accent+'20' }}>{t.tagline}</span>
                      </div>
                      <h3 className="snf" style={{ fontSize:'19px', fontWeight:700, color:'#e8eaf6', marginBottom:'8px', letterSpacing:'-0.3px' }}>{t.name}</h3>
                      <p style={{ color:'#6b7280', fontSize:'13.5px', lineHeight:1.65, marginBottom:'22px' }}>{t.desc}</p>
                      <div style={{ borderRadius:'10px', background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.05)', padding:'14px 16px', overflow:'hidden' }}>
                        <div style={{ display:'flex', gap:'5px', marginBottom:'10px' }}>
                          {['#ff5f57','#febc2e','#28c840'].map(function(c) { return <div key={c} style={{ width:'8px', height:'8px', borderRadius:'50%', background:c, opacity:.6 }} />; })}
                        </div>
                        <pre className="snm" style={{ whiteSpace:'pre', fontSize:'11.5px', lineHeight:1.7, color:'#7dd3fc', overflow:'hidden', margin:0 }}>{t.preview}</pre>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'18px', color:t.accent, fontSize:'13px', fontWeight:600 }}>
                        Open tool
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section style={{ padding:'100px 24px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div style={{ maxWidth:'1000px', margin:'0 auto' }}>
            <p style={{ textAlign:'center', color:'#374151', fontSize:'11.5px', fontWeight:600, textTransform:'uppercase', letterSpacing:'2px', marginBottom:'28px' }}>Trusted by teams at</p>
            <div style={{ display:'flex', justifyContent:'center', gap:'40px', flexWrap:'wrap', marginBottom:'72px', opacity:.4 }}>
              {['Accenture','Deloitte','TCS','Infosys','Wipro','HCL'].map(function(co) {
                return <span key={co} className="snf" style={{ fontSize:'15px', fontWeight:700, color:'#9ca3af', letterSpacing:'.05em' }}>{co}</span>;
              })}
            </div>
            <div style={{ textAlign:'center', marginBottom:'48px' }}>
              <h2 className="snf" style={{ fontSize:'clamp(26px,3.5vw,38px)', fontWeight:800, letterSpacing:'-.8px', color:'#f0f4ff' }}>Developers <span className="sngt">love it</span></h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'16px' }}>
              {TESTIMONIALS.map(function(t, i) {
                return (
                  <div key={i} className="sncard"
                    onMouseOver={function(e) { e.currentTarget.style.borderColor='rgba(99,102,241,.25)'; e.currentTarget.style.background='rgba(99,102,241,.04)'; }}
                    onMouseOut={function(e) { e.currentTarget.style.borderColor='rgba(255,255,255,.06)'; e.currentTarget.style.background='rgba(255,255,255,.02)'; }}
                    style={{ padding:'24px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:'18px', overflow:'hidden' }}>
                    <div style={{ fontSize:'28px', color:'#6366f1', marginBottom:'14px', lineHeight:1, fontFamily:'Georgia,serif', opacity:.5 }}>"</div>
                    <p style={{ color:'#9ca3af', fontSize:'14px', lineHeight:1.7, marginBottom:'20px', fontStyle:'italic' }}>{t.q}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <div className="snavi">{t.avatar}</div>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'#e8eaf6' }}>{t.name}</div>
                        <div style={{ fontSize:'12px', color:'#4b5563', marginTop:'2px' }}>{t.role}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding:'120px 24px', borderTop:'1px solid rgba(255,255,255,.04)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'600px', height:'300px', background:'radial-gradient(ellipse,rgba(99,102,241,.08) 0%,transparent 70%)', pointerEvents:'none' }} />
          <div style={{ maxWidth:'560px', margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 16px', background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.18)', borderRadius:'30px', marginBottom:'28px', fontSize:'12.5px', color:'#a5b4fc' }}>
              <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#4ade80', display:'inline-block' }} />
              Free forever — no account required to search
            </div>
            <h2 className="snf" style={{ fontSize:'clamp(30px,4.5vw,52px)', fontWeight:800, lineHeight:1.05, letterSpacing:'-1.5px', color:'#f0f4ff', marginBottom:'16px' }}>
              Stop Googling.<br />
              <span className="sngt">Start shipping.</span>
            </h2>
            <p style={{ color:'#6b7280', fontSize:'16px', lineHeight:1.7, marginBottom:'36px' }}>Everything a ServiceNow developer needs, in one place, powered by AI.</p>
            <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
              <Link href="/register" className="snbtnp">Get Started Free</Link>
              <Link href="/search" className="snbtng">Try search first →</Link>
            </div>
            <p style={{ color:'#374151', fontSize:'12px', marginTop:'20px' }}>No credit card · No setup · Instant access</p>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
