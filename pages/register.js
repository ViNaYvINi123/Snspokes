import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
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

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Weak',   color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair',   color: '#f59e0b' };
  if (score <= 3) return { score, label: 'Good',   color: '#3b82f6' };
  return                 { score, label: 'Strong', color: '#22c55e' };
}

const s = {
  page:  { minHeight:'100vh', background:'#080810', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:"'Syne', system-ui, sans-serif" },
  card:  { width:'100%', maxWidth:'420px', background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'20px', padding:'32px', boxShadow:'0 24px 80px rgba(0,0,0,0.4)' },
  input: { width:'100%', background:'#111827', border:'1px solid #2a2a3e', borderRadius:'12px', padding:'12px 16px', color:'#e2e8f0', fontSize:'14px', fontFamily:"'Syne', sans-serif", outline:'none', transition:'border-color 0.2s, box-shadow 0.2s', boxSizing:'border-box' },
  btn:   { width:'100%', padding:'13px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:"'Syne', sans-serif", letterSpacing:'0.01em' },
  oauth: { width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'12px', background:'#1a1a2e', border:'1px solid #2a2a3e', borderRadius:'12px', color:'#e2e8f0', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:"'Syne', sans-serif", transition:'all 0.15s' },
  error: { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', marginBottom:'16px' },
  label: { fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'6px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.06em' },
};

export default function Register() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') router.push('/dashboard');
  }, [status]);

  if (status === 'loading') return (
    <div style={{ minHeight:'100vh', background:'#080810', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'32px', height:'32px', border:'2px solid rgba(108,99,255,0.2)', borderTopColor:'#6c63ff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
  const { plan, ref } = router.query;
  const [form,        setForm]        = useState({ name:'', email:'', password:'' });
  const [showPwd,     setShowPwd]     = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [oauthLoading,setOauthLoading]= useState('');

  const strength = getPasswordStrength(form.password);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const focusStyle = { borderColor:'#6c63ff', boxShadow:'0 0 0 3px rgba(108,99,255,0.12)' };
  const blurStyle  = { borderColor:'#2a2a3e', boxShadow:'none' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())          return setError('Name is required');
    if (form.password.length < 8)   return setError('Password must be at least 8 characters');
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan: plan || 'free', ref_code: ref || null }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Registration failed'); setLoading(false); return; }
      const sign = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      router.push(sign?.ok ? '/onboarding' : '/login');
    } catch { setError('Network error. Please try again.'); setLoading(false); }
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    await signIn(provider, { callbackUrl: '/onboarding' });
  };

  return (
    <>
      <Head>
        <title>Create Account — snspokes</title>
        <meta name="description" content="Create your free snspokes account and start building better ServiceNow integrations." />
      </Head>
      <div style={s.page}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration:'none', marginBottom:'28px', display:'flex', alignItems:'center', gap:'10px' }}>
          <img src="/logo.svg" alt="snspokes" width="32" height="32" style={{ borderRadius:'8px' }} />
          <span style={{ fontSize:'20px', fontWeight:'800', color:'#e2e8f0', letterSpacing:'-0.3px' }}>snspokes</span>
        </Link>

        <div style={s.card}>
          <h1 style={{ color:'#fff', fontSize:'22px', fontWeight:'800', marginBottom:'4px', letterSpacing:'-0.02em' }}>
            {plan === 'pro' ? 'Start your Pro trial' : 'Create free account'}
          </h1>
          <p style={{ color:'#6b7280', fontSize:'13px', marginBottom:'20px' }}>
            {ref
              ? '🎁 You were referred — you\'ll get a bonus month when you upgrade!'
              : 'Join 1,000+ ServiceNow developers'}
          </p>

          {/* OAuth */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>
            {[
                            { id:'google', label:'Sign up with Google', Icon: GoogleIcon },
            ].map(({ id, label, Icon }) => (
              <button key={id} onClick={() => handleOAuth(id)} disabled={!!oauthLoading || loading}
                style={{ ...s.oauth, opacity: oauthLoading === id ? 0.7 : 1 }}
                onMouseEnter={e => { e.currentTarget.style.background='#252540'; e.currentTarget.style.borderColor='#6c63ff44'; }}
                onMouseLeave={e => { e.currentTarget.style.background='#1a1a2e'; e.currentTarget.style.borderColor='#2a2a3e'; }}>
                {oauthLoading === id
                  ? <div className="spin" style={{ width:'18px', height:'18px', border:'2px solid #4b4b6a', borderTopColor:'#6c63ff', borderRadius:'50%' }} />
                  : <Icon />}
                {oauthLoading === id ? 'Redirecting...' : label}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:'12px', margin:'16px 0' }}>
            <div style={{ flex:1, height:'1px', background:'#1e1e2e' }} />
            <span style={{ color:'#4b4b6a', fontSize:'12px' }}>or with email</span>
            <div style={{ flex:1, height:'1px', background:'#1e1e2e' }} />
          </div>

          {error && <div style={s.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <div>
              <label style={s.label}>Full Name</label>
              <input value={form.name} onChange={set('name')} placeholder="Alex Johnson" required
                style={s.input}
                onFocus={e => Object.assign(e.target.style, focusStyle)}
                onBlur={e  => Object.assign(e.target.style, blurStyle)}
              />
            </div>
            <div>
              <label style={s.label}>Work Email</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required
                style={s.input}
                onFocus={e => Object.assign(e.target.style, focusStyle)}
                onBlur={e  => Object.assign(e.target.style, blurStyle)}
              />
            </div>
            <div>
              <label style={s.label}>Password</label>
              <div style={{ position:'relative' }}>
                <input type={showPwd?'text':'password'} value={form.password} onChange={set('password')} placeholder="Min 8 characters" required minLength={8}
                  style={{ ...s.input, paddingRight:'44px' }}
                  onFocus={e => Object.assign(e.target.style, focusStyle)}
                  onBlur={e  => Object.assign(e.target.style, blurStyle)}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#6b7280', cursor:'pointer', padding:'2px', display:'flex' }}>
                  <EyeIcon open={showPwd} />
                </button>
              </div>
              {/* Password strength indicator */}
              {form.password && (
                <div style={{ marginTop:'8px' }}>
                  <div style={{ display:'flex', gap:'4px', marginBottom:'4px' }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex:1, height:'3px', borderRadius:'2px', background: i <= strength.score ? strength.color : '#1e1e2e', transition:'background 0.3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize:'11px', color: strength.color, fontWeight:'600' }}>{strength.label}</span>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading}
              style={{ ...s.btn, opacity: loading ? 0.7 : 1, marginTop:'4px' }}>
              {loading
                ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                    <div className="spin" style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%' }} />
                    Creating account...
                  </span>
                : plan === 'pro' ? 'Start Pro Trial →' : 'Create Free Account →'}
            </button>
          </form>

          <p style={{ color:'#4b4b6a', fontSize:'11px', textAlign:'center', marginTop:'14px', lineHeight:'1.5' }}>
            By signing up you agree to our{' '}
            <Link href="/terms" style={{ color:'#6b7280', textDecoration:'none' }}>Terms</Link>
            {' & '}
            <Link href="/privacy" style={{ color:'#6b7280', textDecoration:'none' }}>Privacy Policy</Link>
          </p>

          <p style={{ color:'#6b7280', fontSize:'13px', textAlign:'center', marginTop:'16px' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color:'#6c63ff', fontWeight:'700', textDecoration:'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
