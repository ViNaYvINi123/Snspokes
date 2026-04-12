import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const s = {
  page:   { minHeight:'100vh', background:'#080810', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:"'DM Sans', system-ui, sans-serif" },
  card:   { width:'100%', maxWidth:'420px', background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'20px', padding:'36px 32px', boxShadow:'0 24px 80px rgba(0,0,0,0.4)' },
  input:  { width:'100%', background:'#111827', border:'1px solid #2a2a3e', borderRadius:'12px', padding:'12px 16px', color:'#e2e8f0', fontSize:'14px', fontFamily:"'DM Sans', sans-serif", outline:'none', transition:'border-color 0.2s, box-shadow 0.2s', boxSizing:'border-box' },
  btn:    { width:'100%', padding:'13px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:"'DM Sans', sans-serif", transition:'opacity 0.2s, transform 0.1s', letterSpacing:'0.01em' },
  oauth:  { width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'12px', background:'#1a1a2e', border:'1px solid #2a2a3e', borderRadius:'12px', color:'#e2e8f0', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:"'DM Sans', sans-serif", transition:'all 0.15s' },
  error:  { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', marginBottom:'16px' },
  label:  { fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'6px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' },
  divider:{ display:'flex', alignItems:'center', gap:'12px', margin:'20px 0' },
  divLine:{ flex:1, height:'1px', background:'#1e1e2e' },
  divTxt: { color:'#4b4b6a', fontSize:'12px', whiteSpace:'nowrap' },
};

export default function Login() {
  const router = useRouter();
  const { status } = useSession();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [oauthLoading,setOauthLoading]= useState('');

  const callbackUrl = router.query.callbackUrl || '/dashboard';
  const reason = router.query.reason;

  const SESSION_MESSAGES = {
    expired:  { text: 'Your session has expired. Please sign in again.', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: '⏱️' },
    required: { text: 'Please sign in to access that page.',             color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', icon: '🔒' },
  };
  const sessionMsg = SESSION_MESSAGES[reason] || null;

  // Redirect AFTER render, not during
  useEffect(() => {
    if (status === 'authenticated') router.push(callbackUrl);
  }, [status]);

  // Show spinner while checking session (prevents flash of form then redirect)
  if (status === 'loading') return (
    <div style={{ minHeight:'100vh', background:'#080810', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'32px', height:'32px', border:'2px solid rgba(108,99,255,0.2)', borderTopColor:'#6c63ff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
  const isBanned    = router.query.error === 'banned';
  const oauthError  = ['AccessDenied','OAuthCallback','OAuthSignin','OAuthAccountNotLinked','Callback'].includes(router.query.error);
  const configError = router.query.error === 'Configuration';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Please fill in all fields');
    setLoading(true); setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    if (res?.error) {
      setError('Incorrect email or password. Please try again.');
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In — snspokes</title>
        <meta name="description" content="Sign in to your snspokes account" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.6s linear infinite; }`}</style>

      <div style={s.page}>
        <div style={s.card}>
          <div style={{ textAlign:'center', marginBottom:'28px' }}>
            <Link href="/" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'10px' }}>
              <img src="/logo.svg" alt="snspokes" width="32" height="32" style={{ borderRadius:'8px' }} />
              <span style={{ fontSize:'20px', fontWeight:'800', color:'#e2e8f0', letterSpacing:'-0.3px' }}>snspokes</span>
            </Link>
            <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#e2e8f0', margin:'16px 0 6px' }}>Welcome back</h1>
            <p style={{ color:'#6b7280', fontSize:'14px', margin:0 }}>Sign in to continue</p>
          </div>

          {isBanned && <div style={{ ...s.error, marginBottom:'20px' }}>Your account has been suspended. Contact support for help.</div>}

          {oauthError && <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'10px', padding:'11px 14px', fontSize:'13px', color:'#f59e0b', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
            <span>⚠️</span> Google sign-in is not available right now. Please use email and password instead.
          </div>}

          {configError && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'10px', padding:'11px 14px', fontSize:'13px', color:'#f87171', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
            <span>❌</span> Authentication configuration error. Please contact support.
          </div>}

          {sessionMsg && (
            <div style={{ background: sessionMsg.bg, border: '1px solid ' + sessionMsg.border, borderRadius: '10px', padding: '11px 14px', fontSize: '13px', color: sessionMsg.color, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{sessionMsg.icon}</span>
              {sessionMsg.text}
            </div>
          )}

          <button onClick={() => { setOauthLoading('google'); signIn('google', { callbackUrl }); }} disabled={!!oauthLoading}
            style={{ ...s.oauth, opacity: oauthLoading === 'google' ? 0.7 : 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#6c63ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#2a2a3e'; }}>
            {oauthLoading === 'google'
              ? <div className="spin" style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%' }} />
              : <GoogleIcon />}
            Continue with Google
          </button>

          <div style={s.divider}><div style={s.divLine}/><span style={s.divTxt}>or with email</span><div style={s.divLine}/></div>

          {error && <div style={s.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div>
              <label style={s.label}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required
                style={s.input}
                onFocus={e => { e.target.style.borderColor='#6c63ff'; e.target.style.boxShadow='0 0 0 3px rgba(108,99,255,0.12)'; }}
                onBlur={e  => { e.target.style.borderColor='#2a2a3e'; e.target.style.boxShadow='none'; }} />
            </div>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                <label style={{ ...s.label, margin:0 }}>Password</label>
                <Link href="/forgot-password" style={{ color:'#6c63ff', fontSize:'12px', textDecoration:'none', fontWeight:'600' }}>Forgot?</Link>
              </div>
              <div style={{ position:'relative' }}>
                <input type={showPwd?'text':'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  style={{ ...s.input, paddingRight:'44px' }}
                  onFocus={e => { e.target.style.borderColor='#6c63ff'; e.target.style.boxShadow='0 0 0 3px rgba(108,99,255,0.12)'; }}
                  onBlur={e  => { e.target.style.borderColor='#2a2a3e'; e.target.style.boxShadow='none'; }} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#6b7280', cursor:'pointer', padding:'2px', display:'flex' }}>
                  <EyeIcon open={showPwd} />
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity='0.9'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = loading ? '0.7' : '1'; }}>
              {loading
                ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                    <div className="spin" style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%' }} />
                    Signing in...
                  </span>
                : 'Sign In'}
            </button>
          </form>

          <p style={{ color:'#6b7280', fontSize:'13px', textAlign:'center', marginTop:'20px' }}>
            {"Don't have an account? "}
            <Link href="/register" style={{ color:'#6c63ff', fontWeight:'700', textDecoration:'none' }}>Sign up free</Link>
          </p>
        </div>
      </div>
    </>
  );
}
