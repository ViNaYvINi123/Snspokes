import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const SPOKES = [
  { slug:'slack', name:'Slack', icon:'💬', desc:'Send messages, create channels, manage users', color:'#4A154B' },
  { slug:'jira', name:'Jira', icon:'🔷', desc:'Create issues, update sprints, sync projects', color:'#0052CC' },
  { slug:'microsoft-teams', name:'Teams', icon:'🟦', desc:'Post messages, manage channels, adaptive cards', color:'#5059C9' },
  { slug:'github', name:'GitHub', icon:'🐙', desc:'Repos, issues, pull requests and workflows', color:'#238636' },
  { slug:'aws', name:'AWS', icon:'☁️', desc:'EC2, S3, Lambda and other AWS services', color:'#FF9900' },
  { slug:'pagerduty', name:'PagerDuty', icon:'🚨', desc:'Incidents, on-call schedules and alerts', color:'#25c151' },
  { slug:'salesforce', name:'Salesforce', icon:'☁️', desc:'CRM records, opportunities and cases', color:'#00A1E0' },
  { slug:'okta', name:'Okta', icon:'🔐', desc:'Users, groups and IAM management', color:'#007DC1' },
];

const TOOLS = [
  { href:'/tools/code-generator', icon:'💻', name:'Code Generator', desc:'AI-powered GlideRecord and Flow Designer code', accent:'#6c63ff' },
  { href:'/tools/error-finder', icon:'🐛', name:'Error Finder', desc:'Paste any error, get root cause + fix', accent:'#f59e0b' },
  { href:'/tools/cheatsheet', icon:'📖', name:'Cheatsheet', desc:'Every GlideRecord & g_form method on one page', accent:'#84cc16' },
];

function useTypewriter(phrases, speed = 55, pause = 2200) {
  const [text, setText] = useState('');
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const phrase = phrases[idx];
    const timer = setTimeout(() => {
      if (!deleting) {
        setText(phrase.slice(0, charIdx + 1));
        if (charIdx + 1 === phrase.length) setTimeout(() => setDeleting(true), pause);
        else setCharIdx(c => c + 1);
      } else {
        setText(phrase.slice(0, charIdx));
        if (charIdx === 0) { setDeleting(false); setIdx(i => (i + 1) % phrases.length); }
        else setCharIdx(c => c - 1);
      }
    }, deleting ? 25 : speed);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, idx]);
  return text;
}

function Counter({ end, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setVal(end); clearInterval(timer); }
          else setVal(Math.floor(start));
        }, 16);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <span ref={ref}>{val}{suffix}</span>;
}

export default function Home() {
  const router = useRouter();
  const [searchQ, setSearchQ] = useState('');
  const typed = useTypewriter(['Slack spoke setup...', 'GlideRecord best practices...', 'OAuth 2.0 configuration...', 'Error: ACL restricted...']);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) router.push(`/search?q=${encodeURIComponent(searchQ)}`);
  };

  return (
    <>
      <Head>
        <title>snspokes — ServiceNow Integration Hub Reference</title>
        <meta name="description" content="AI-powered spoke docs, code tools, and search for ServiceNow developers" />
      </Head>
      <Navbar />

      <main>
        {/* ═══ HERO ═══ */}
        <section className="hero-bg grid-bg" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
          {/* Floating orbs */}
          <div style={{ position:'absolute', top:'10%', left:'15%', width:'300px', height:'300px', background:'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)', borderRadius:'50%', filter:'blur(60px)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'15%', right:'10%', width:'250px', height:'250px', background:'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', borderRadius:'50%', filter:'blur(50px)', pointerEvents:'none' }} />

          <div style={{ maxWidth: '760px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            {/* Badge */}
            <div className="fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: '30px', marginBottom: '28px', fontSize: '13px', color: '#8b85ff' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              Powered by AI — Free to use
            </div>

            <h1 className="fade-in" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: '800', lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '18px' }}>
              The developer toolkit for{' '}
              <span className="gradient-text">ServiceNow</span>
            </h1>

            <p className="fade-in" style={{ color: '#7777aa', fontSize: '17px', lineHeight: 1.7, maxWidth: '540px', margin: '0 auto 36px', animationDelay: '0.1s' }}>
              Search 200+ Integration Hub spokes, generate code, lint scripts, and debug errors — all powered by AI.
            </p>

            {/* Live search bar on homepage */}
            <form onSubmit={handleSearch} className="fade-in" style={{ animationDelay: '0.2s' }}>
              <div style={{ display: 'flex', gap: '8px', padding: '6px', maxWidth: '580px', margin: '0 auto', borderRadius: '18px', background: 'rgba(15,15,26,0.8)', border: '1px solid #1e1e2e', boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(108,99,255,0.06)', backdropFilter: 'blur(20px)' }}>
                <div style={{ paddingLeft: '16px', display: 'flex', alignItems: 'center' }}>
                  <svg width="18" height="18" fill="none" stroke="#6b6b8a" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder={searchQ ? '' : typed}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f0f0f8', fontSize: '15px', fontFamily: 'inherit', padding: '12px 8px' }} />
                <button type="submit"
                  style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '13px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Search
                </button>
              </div>
            </form>

            <p className="fade-in" style={{ color: '#444', fontSize: '12px', marginTop: '14px', animationDelay: '0.3s' }}>
              or press <kbd style={{ padding: '2px 6px', background: '#1a1a2e', borderRadius: '4px', border: '1px solid #2a2a3e', color: '#6b6b8a' }}>⌘K</kbd> to search anywhere
            </p>

            {/* Stats */}
            <div className="fade-in" style={{ display: 'flex', gap: '40px', justifyContent: 'center', marginTop: '48px', animationDelay: '0.4s' }}>
              {[{ v: 200, s: '+', l: 'Spokes' }, { v: 5, s: '', l: 'AI Tools' }, { v: 100, s: '%', l: 'Free' }].map(st => (
                <div key={st.l}>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff' }}><Counter end={st.v} suffix={st.s} /></div>
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ SPOKES MARQUEE ═══ */}
        <section style={{ padding: '60px 24px', borderTop: '1px solid #111827' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <p style={{ textAlign: 'center', color: '#555', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '32px' }}>Popular Integration Hub Spokes</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {SPOKES.map((s, i) => (
                <Link key={s.slug} href={`/spoke/${s.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="card-hover fade-in" style={{ padding: '18px', borderRadius: '14px', background: '#0d0d18', cursor: 'pointer', animationDelay: `${i * 0.05}s` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${s.color}20`, border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{s.icon}</div>
                      <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '700' }}>{s.name}</span>
                    </div>
                    <p style={{ color: '#666', fontSize: '12px', lineHeight: 1.5 }}>{s.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link href="/spokes" style={{ color: '#6c63ff', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>View all 200+ spokes →</Link>
            </div>
          </div>
        </section>

        {/* ═══ TOOLS ═══ */}
        <section style={{ padding: '60px 24px', borderTop: '1px solid #111827' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '10px' }}>
                Developer <span className="gradient-text">Power Tools</span>
              </h2>
              <p style={{ color: '#666', fontSize: '15px' }}>AI-powered tools built specifically for ServiceNow developers</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {TOOLS.map((t, i) => (
                <Link key={t.href} href={t.href} style={{ textDecoration: 'none' }}>
                  <div className="card-hover fade-in" style={{ padding: '24px', borderRadius: '16px', background: '#0d0d18', cursor: 'pointer', height: '100%', animationDelay: `${i * 0.08}s` }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${t.accent}15`, border: `1px solid ${t.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '14px' }}>{t.icon}</div>
                    <h3 style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>{t.name}</h3>
                    <p style={{ color: '#666', fontSize: '13px', lineHeight: 1.55 }}>{t.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section style={{ padding: '80px 24px', borderTop: '1px solid #111827' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px' }}>
              Ready to <span className="gradient-text">ship faster?</span>
            </h2>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '28px' }}>Join thousands of ServiceNow developers using snspokes daily.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" style={{ padding: '13px 32px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none', fontFamily: 'inherit' }}>Get Started Free</Link>
              <Link href="/spokes" style={{ padding: '13px 32px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '12px', color: '#8b85ff', fontSize: '14px', fontWeight: '600', textDecoration: 'none', fontFamily: 'inherit' }}>Browse Spokes</Link>
            </div>
          </div>
        </section>

          {/* Social Proof */}
          <section style={{ padding: '60px 24px', borderTop: '1px solid #111827' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
              <p style={{ color: '#555', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '28px' }}>Trusted by ServiceNow teams worldwide</p>
              <div style={{ display: 'flex', gap: '48px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
                {['Accenture', 'Deloitte', 'TCS', 'Infosys', 'Wipro', 'HCL'].map(co => (
                  <span key={co} style={{ fontSize: '16px', fontWeight: '700', color: '#2a2a3e', letterSpacing: '0.05em' }}>{co}</span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {[
                  { quote: 'snspokes saves me 2+ hours daily. The code generator is incredibly accurate.', name: 'Priya S.', role: 'SN Developer, TCS' },
                  { quote: 'Finally a tool that understands ServiceNow. The snippet library alone is worth it.', name: 'James R.', role: 'SN Architect, Deloitte' },
                  { quote: 'Replaced 3 browser bookmarks. Search + AI chatbot answers everything instantly.', name: 'Arun K.', role: 'SN Admin, Infosys' },
                ].map(t => (
                  <div key={t.name} style={{ padding: '20px', background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: '14px', textAlign: 'left' }}>
                    <p style={{ color: '#9999bb', fontSize: '13px', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '12px' }}>"{t.quote}"</p>
                    <div><span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>{t.name}</span> <span style={{ color: '#555', fontSize: '12px' }}>— {t.role}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA + Email */}
          <section style={{ padding: '60px 24px', borderTop: '1px solid #111827', textAlign: 'center' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>Start building <span className="gradient-text">faster</span></h2>
              <p style={{ color: '#666', fontSize: '15px', marginBottom: '28px' }}>Join thousands of ServiceNow developers using snspokes daily.</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/register" style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '700', textDecoration: 'none' }}>Get Started Free</a>
                <a href="/docs/api" style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #2a2a3e', borderRadius: '10px', color: '#9999bb', fontSize: '15px', textDecoration: 'none' }}>View API Docs</a>
              </div>
            </div>
          </section>
      </main>
      <Footer />
    </>
  );
}
