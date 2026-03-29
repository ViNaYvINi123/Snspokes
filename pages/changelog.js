import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const HARDCODED = [
  {
    version: '1.0.0',
    date: '2025-01-01',
    type: 'launch',
    title: 'snspokes is live! 🚀',
    changes: [
      { type: 'new', text: 'Search 200+ ServiceNow Integration Hub spokes' },
      { type: 'new', text: 'AI-powered spoke explanations and code examples' },
      { type: 'new', text: 'Code Generator — 7 types of ServiceNow code with AI' },
      { type: 'new', text: 'Script Linter — 15 rules + AI code review' },
      { type: 'new', text: 'Error Finder — AI error analysis and fixes' },
      { type: 'new', text: 'Query Builder — visual GlideRecord query builder' },
      { type: 'new', text: 'Version Matrix — SN version compatibility checker' },
    ],
  },
];

const TYPE_COLORS  = { new:'#6c63ff', fix:'#4ade80', improved:'#FFB347', removed:'#f87171' };
const TYPE_LABELS  = { new:'New', fix:'Fix', improved:'Improved', removed:'Removed' };
const RELEASE_COLORS = { launch:'#6c63ff', feature:'#00D4AA', fix:'#4ade80', security:'#f87171' };

export default function Changelog() {
  const [entries, setEntries] = useState(HARDCODED);

  useEffect(() => {
    // Try to load from admin-managed changelog API
    fetch('/api/changelog')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.entries?.length) setEntries(d.entries); })
      .catch(() => {}); // silently use hardcoded
  }, []);

  return (
    <>
      <Head>
        <title>Changelog — snspokes</title>
        <meta name="description" content="See what's new in snspokes — every update, fix, and improvement." />
      </Head>
      <Navbar />
      <main style={{ paddingTop:'90px', minHeight:'100vh', background:'#0a0a0f', fontFamily:"'Syne', system-ui, sans-serif" }}>
        <div style={{ maxWidth:'720px', margin:'0 auto', padding:'60px 24px' }}>
          <div style={{ marginBottom:'48px' }}>
            <h1 style={{ fontSize:'40px', fontWeight:'800', color:'#fff', margin:'0 0 12px', letterSpacing:'-0.03em' }}>Changelog</h1>
            <p style={{ color:'#6b7280', fontSize:'16px' }}>Every update, fix, and improvement to snspokes.</p>
            <div style={{ display:'flex', gap:'12px', marginTop:'16px' }}>
              <Link href="/search" style={{ padding:'8px 16px', background:'rgba(108,99,255,0.1)', border:'1px solid rgba(108,99,255,0.3)', borderRadius:'8px', color:'#8b85ff', textDecoration:'none', fontSize:'13px' }}>Search Spokes →</Link>
              <Link href="/pricing" style={{ padding:'8px 16px', background:'#1e1e2e', border:'1px solid #2a2a3e', borderRadius:'8px', color:'#9999bb', textDecoration:'none', fontSize:'13px' }}>View Pricing</Link>
            </div>
          </div>

          {entries.map((release, i) => (
            <div key={i} style={{ display:'flex', gap:'24px', marginBottom:'48px' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:RELEASE_COLORS[release.type]||'#6c63ff', marginTop:'8px' }} />
                {i < entries.length-1 && <div style={{ width:'2px', flex:1, background:'#1e1e2e', marginTop:'8px' }} />}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                  <span style={{ background:`${RELEASE_COLORS[release.type]||'#6c63ff'}22`, color:RELEASE_COLORS[release.type]||'#6c63ff', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'700' }}>v{release.version}</span>
                  <span style={{ color:'#6b7280', fontSize:'13px' }}>{new Date(release.date).toLocaleDateString('en',{year:'numeric',month:'long',day:'numeric'})}</span>
                </div>
                <h2 style={{ color:'#fff', fontSize:'20px', fontWeight:'800', margin:'0 0 16px', letterSpacing:'-0.02em' }}>{release.title}</h2>
                <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                  {release.changes.map((ch, j) => (
                    <li key={j} style={{ display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'10px' }}>
                      <span style={{ background:`${TYPE_COLORS[ch.type]||'#6b7280'}22`, color:TYPE_COLORS[ch.type]||'#6b7280', padding:'1px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', flexShrink:0, marginTop:'2px' }}>{TYPE_LABELS[ch.type]||ch.type}</span>
                      <span style={{ color:'#9999bb', fontSize:'14px', lineHeight:'1.5' }}>{ch.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
