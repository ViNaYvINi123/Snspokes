import Head from 'next/head';
import Link from 'next/link';

export default function Error500() {
  return (
    <>
      <Head><title>Server Error — snspokes</title></Head>
      <div style={{ minHeight:'100vh', background:'#080810', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'24px', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
        <div style={{ fontSize:'80px', lineHeight:1, background:'linear-gradient(135deg,#ef4444,#dc2626)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'16px', fontWeight:'800', letterSpacing:'-0.04em' }}>
          500
        </div>
        <h1 style={{ color:'#fff', fontSize:'24px', fontWeight:'800', marginBottom:'10px' }}>Something went wrong</h1>
        <p style={{ color:'#6b7280', fontSize:'14px', marginBottom:'32px', maxWidth:'340px', lineHeight:'1.6' }}>
          We hit an unexpected error on our end. Our team has been notified. Please try again.
        </p>
        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', justifyContent:'center' }}>
          <button onClick={() => typeof window !== 'undefined' && window.location.reload()}
            style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>
            Try Again
          </button>
          <Link href="/" style={{ padding:'10px 24px', border:'1px solid #1e1e2e', borderRadius:'10px', color:'#9999bb', fontSize:'13px', textDecoration:'none' }}>
            Go Home
          </Link>
        </div>
        <Link href="/status" style={{ color:'#6b7280', fontSize:'12px', textDecoration:'none', marginTop:'20px' }}>
          Check system status →
        </Link>
      </div>
    </>
  );
}
