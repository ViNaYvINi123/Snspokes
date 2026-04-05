import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const S = {
  page:  { minHeight:'100vh', background:'#080810', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:"'Syne', system-ui, sans-serif" },
  card:  { width:'100%', maxWidth:'420px', background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'20px', padding:'32px', boxShadow:'0 24px 80px rgba(0,0,0,0.4)' },
  input: { width:'100%', background:'#111827', border:'1px solid #2a2a3e', borderRadius:'12px', padding:'12px 16px', color:'#e2e8f0', fontSize:'14px', fontFamily:"'Syne', sans-serif", outline:'none', boxSizing:'border-box', transition:'border-color 0.2s, box-shadow 0.2s' },
  btn:   { width:'100%', padding:'13px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:"'Syne', sans-serif" },
  err:   { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', marginBottom:'16px' },
};
const focus = { borderColor:'#6c63ff', boxShadow:'0 0 0 3px rgba(108,99,255,0.12)' };
const blur  = { borderColor:'#2a2a3e', boxShadow:'none' };

function StrengthBar({ pwd }) {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8)           score++;
  if (pwd.length >= 12)          score++;
  if (/[A-Z]/.test(pwd))         score++;
  if (/[0-9]/.test(pwd))         score++;
  if (/[^A-Za-z0-9]/.test(pwd))  score++;
  const color = score <= 1 ? '#ef4444' : score <= 2 ? '#f59e0b' : score <= 3 ? '#3b82f6' : '#22c55e';
  const label = score <= 1 ? 'Weak' : score <= 2 ? 'Fair' : score <= 3 ? 'Good' : 'Strong';
  return (
    <div style={{ marginTop:'8px' }}>
      <div style={{ display:'flex', gap:'4px', marginBottom:'3px' }}>
        {[1,2,3,4].map(i => <div key={i} style={{ flex:1, height:'3px', borderRadius:'2px', background: i<=score ? color : '#1e1e2e', transition:'background 0.3s' }} />)}
      </div>
      <span style={{ fontSize:'11px', color, fontWeight:'600' }}>{label}</span>
    </div>
  );
}

export default function ForgotPassword() {
  const router = useRouter();
  const [step,     setStep]     = useState('request'); // request | sent | reset | done
  const [email,    setEmail]    = useState('');
  const [token,    setToken]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken && step === 'request') { setToken(urlToken); setStep('reset'); }
  }, []);

  async function handleRequest(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/forgot-password', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, action:'request' }) });
      const data = await res.json();
      if (data.success) setStep('sent'); else setError(data.error || 'Failed to send email');
    } catch { setError('Network error, please try again'); }
    setLoading(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    if (password.length < 8)      return setError('Password must be at least 8 characters');
    if (password !== confirm)      return setError('Passwords do not match');
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/forgot-password', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token, password, action:'reset' }) });
      const data = await res.json();
      if (data.success) setStep('done'); else setError(data.error || 'Reset failed. Token may have expired.');
    } catch { setError('Network error, please try again'); }
    setLoading(false);
  }

  return (
    <>
      <Head><title>Reset Password — snspokes</title></Head>
      <div style={S.page}>
        <Link href="/" style={{ textDecoration:'none', marginBottom:'28px', display:'flex', alignItems:'center', gap:'10px' }}>
          <img src="/logo.svg" alt="snspokes" width="32" height="32" style={{ borderRadius:'8px' }} />
          <span style={{ fontSize:'20px', fontWeight:'800', color:'#e2e8f0', letterSpacing:'-0.3px' }}>snspokes</span>
        </Link>
        <div style={S.card}>

          {step === 'request' && (<>
            <h1 style={{ color:'#fff', fontSize:'22px', fontWeight:'800', marginBottom:'6px' }}>Reset your password</h1>
            <p style={{ color:'#6b7280', fontSize:'13px', marginBottom:'24px' }}>Enter your email and we'll send a reset link.</p>
            {error && <div style={S.err}>{error}</div>}
            <form onSubmit={handleRequest} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <label style={{ fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'5px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={S.input}
                  onFocus={e => Object.assign(e.target.style, focus)} onBlur={e => Object.assign(e.target.style, blur)} />
              </div>
              <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading?0.7:1 }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>)}

          {step === 'sent' && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ fontSize:'52px', marginBottom:'16px' }}>📧</div>
              <h2 style={{ color:'#fff', fontSize:'20px', fontWeight:'800', marginBottom:'8px' }}>Check your inbox</h2>
              <p style={{ color:'#6b7280', fontSize:'13px', marginBottom:'6px' }}>We sent a reset link to <strong style={{ color:'#e2e8f0' }}>{email}</strong></p>
              <p style={{ color:'#4b4b6a', fontSize:'12px', marginBottom:'20px' }}>Link expires in 1 hour. Check spam if you don't see it.</p>
              <button onClick={() => setStep('request')} style={{ background:'none', border:'none', color:'#6c63ff', fontSize:'13px', cursor:'pointer', fontFamily:"'Syne', sans-serif", fontWeight:'600' }}>← Try different email</button>
            </div>
          )}

          {step === 'reset' && (<>
            <h1 style={{ color:'#fff', fontSize:'22px', fontWeight:'800', marginBottom:'6px' }}>Set new password</h1>
            <p style={{ color:'#6b7280', fontSize:'13px', marginBottom:'24px' }}>Choose a strong password (min 8 characters).</p>
            {error && <div style={S.err}>{error}</div>}
            <form onSubmit={handleReset} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <label style={{ fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'5px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' }}>New Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} style={S.input}
                  onFocus={e => Object.assign(e.target.style, focus)} onBlur={e => Object.assign(e.target.style, blur)} />
                <StrengthBar pwd={password} />
              </div>
              <div>
                <label style={{ fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'5px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' }}>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required style={{ ...S.input, borderColor: confirm && confirm !== password ? '#ef4444' : undefined }}
                  onFocus={e => Object.assign(e.target.style, focus)} onBlur={e => Object.assign(e.target.style, blur)} />
                {confirm && confirm !== password && <div style={{ fontSize:'11px', color:'#f87171', marginTop:'4px' }}>Passwords do not match</div>}
              </div>
              <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading?0.7:1, marginTop:'4px' }}>
                {loading ? 'Resetting...' : 'Set New Password'}
              </button>
            </form>
          </>)}

          {step === 'done' && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ fontSize:'52px', marginBottom:'16px' }}>✅</div>
              <h2 style={{ color:'#fff', fontSize:'20px', fontWeight:'800', marginBottom:'8px' }}>Password updated!</h2>
              <p style={{ color:'#6b7280', fontSize:'13px', marginBottom:'24px' }}>You can now sign in with your new password.</p>
              <Link href="/login" style={{ display:'block', padding:'13px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', borderRadius:'12px', color:'#fff', textDecoration:'none', fontSize:'14px', fontWeight:'700', textAlign:'center' }}>
                Sign In →
              </Link>
            </div>
          )}

          <p style={{ color:'#4b4b6a', fontSize:'12px', textAlign:'center', marginTop:'20px' }}>
            <Link href="/login" style={{ color:'#6b7280', textDecoration:'none' }}>← Back to login</Link>
          </p>
        </div>
      </div>
    </>
  );
}
