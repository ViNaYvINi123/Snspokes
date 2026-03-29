import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function NotFound() {
  const suggestions = [
    { href:'/search',   icon:'🔍', label:'Search Spokes' },
    { href:'/spokes',   icon:'🔌', label:'Browse All' },
    { href:'/tools/code-generator', icon:'💻', label:'Code Generator' },
    { href:'/tools/error-finder',   icon:'🐛', label:'Error Finder' },
  ];

  return (
    <>
      <Head><title>Page Not Found — snspokes</title></Head>
      <Navbar />
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'24px', fontFamily:"'Syne', system-ui, sans-serif" }}>

        {/* Big 404 */}
        <div style={{ fontSize:'120px', fontWeight:'800', lineHeight:1, background:'linear-gradient(135deg,#6c63ff,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'16px', letterSpacing:'-0.04em' }}>
          404
        </div>

        <h1 style={{ color:'#fff', fontSize:'24px', fontWeight:'800', marginBottom:'10px', letterSpacing:'-0.02em' }}>
          Page not found
        </h1>
        <p style={{ color:'#6b7280', fontSize:'15px', maxWidth:'360px', lineHeight:'1.6', marginBottom:'36px' }}>
          The spoke or page you're looking for doesn't exist. Try searching or browse our directory.
        </p>

        {/* Quick suggestions */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:'10px', justifyContent:'center', marginBottom:'32px' }}>
          {suggestions.map(s => (
            <Link key={s.href} href={s.href}
              style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 18px', background:'#111827', border:'1px solid #1e1e2e', borderRadius:'12px', color:'#9999bb', textDecoration:'none', fontSize:'13px', fontWeight:'600', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#6c63ff'; e.currentTarget.style.color='#fff'; e.currentTarget.style.background='#1a1a2e'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#1e1e2e'; e.currentTarget.style.color='#9999bb'; e.currentTarget.style.background='#111827'; }}>
              <span>{s.icon}</span> {s.label}
            </Link>
          ))}
        </div>

        <Link href="/" style={{ color:'#6c63ff', fontSize:'13px', textDecoration:'none', fontWeight:'600' }}>
          ← Back to home
        </Link>
      </div>
    </>
  );
}
