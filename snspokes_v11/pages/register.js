import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try {
      await axios.post('/api/auth/register', { name: form.name, email: form.email, password: form.password });
      const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (result?.error) setSuccess(true);
      else router.push('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account. Please try again.');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => { setGoogleLoading(true); await signIn('google', { callbackUrl: '/' }); };

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080810' }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Account created!</h2>
        <p style={{ color: '#6b6b8a', marginBottom: '24px' }}>Welcome to snspokes</p>
        <Link href="/login" style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', borderRadius: '10px', color: '#fff', textDecoration: 'none', fontWeight: '600' }}>Sign in now →</Link>
      </div>
    </div>
  );

  return (
    <>
      <Head><title>Sign up — snspokes</title></Head>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#080810' }}>
        <div style={{ position: 'fixed', top: '30%', right: '20%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: '#fff' }}>S</div>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>snspokes<span style={{ color: '#6c63ff' }}>.do</span></span>
            </Link>
          </div>
          <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '20px', padding: '40px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '8px', textAlign: 'center' }}>Create account</h1>
            <p style={{ color: '#6b6b8a', fontSize: '14px', textAlign: 'center', marginBottom: '32px' }}>Free forever. No credit card required.</p>
            {error && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#f87171', fontSize: '13px', marginBottom: '20px' }}>⚠️ {error}</div>}
            <button onClick={handleGoogle} disabled={googleLoading} style={{ width: '100%', padding: '12px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', marginBottom: '20px', fontSize: '14px', fontWeight: '600', color: '#333', fontFamily: 'Syne, sans-serif', opacity: googleLoading ? 0.7 : 1 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            ><GoogleIcon />{googleLoading ? 'Connecting...' : 'Sign up with Google'}</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: '#1e1e2e' }} />
              <span style={{ color: '#6b6b8a', fontSize: '12px' }}>or sign up with email</span>
              <div style={{ flex: 1, height: '1px', background: '#1e1e2e' }} />
            </div>
            <form onSubmit={handleSubmit}>
              {[{ label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Smith' }, { label: 'Email', key: 'email', type: 'email', placeholder: 'you@company.com' }, { label: 'Password', key: 'password', type: 'password', placeholder: '8+ characters' }, { label: 'Confirm Password', key: 'confirm', type: 'password', placeholder: 'Repeat password' }].map(field => (
                <div key={field.key} style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#9999bb', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>{field.label}</label>
                  <input type={field.type} required value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} placeholder={field.placeholder}
                    style={{ width: '100%', padding: '12px 16px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: 'Syne, sans-serif' }} />
                </div>
              ))}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Syne, sans-serif', opacity: loading ? 0.7 : 1, marginTop: '8px' }}>
                {loading ? 'Creating account...' : 'Create free account'}
              </button>
            </form>
            <p style={{ textAlign: 'center', color: '#6b6b8a', fontSize: '14px', marginTop: '24px' }}>
              Already have an account? <Link href="/login" style={{ color: '#6c63ff', textDecoration: 'none', fontWeight: '600' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
