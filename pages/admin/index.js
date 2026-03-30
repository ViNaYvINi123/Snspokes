import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';


export default function AdminLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      // Validate token before redirecting
      fetch('/api/admin/system', { headers: { 'x-admin-token': token } })
        .then(r => {
          if (r.ok) router.replace('/admin/dashboard');
          else localStorage.removeItem('admin_token');
        })
        .catch(() => localStorage.removeItem('admin_token'));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await axios.post('/api/admin/login', form);
      if (res.data.success) {
        localStorage.setItem('admin_token', res.data.token);
        router.push('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const inp = (extra = {}) => ({
    width: '100%', padding: '9px 12px', background: '#0f0f1a',
    border: '1px solid #1e1e2e', borderRadius: '8px',
    fontSize: '14px', color: '#e2e8f0', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
    ...extra,
  });

  return (
    <>
      <Head>
        <title>Sign in — snspokes Admin</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Inter, system-ui, sans-serif; background: #0a0a0f; }
        input:focus { border-color: #6c63ff !important; box-shadow: 0 0 0 3px rgba(108,99,255,0.1); }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex' }}>
        {/* Left panel - branding */}
        <div style={{ width: '420px', background: 'linear-gradient(160deg, #6c63ff 0%, #a855f7 100%)', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px' }}>
              <img src="/logo.svg" alt="snspokes" width="36" height="36" style={{ borderRadius: '8px', filter: 'brightness(0) invert(1)' }} />
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>snspokes</span>
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#fff', lineHeight: '1.3', marginBottom: '16px' }}>
              The ServiceNow Integration Hub Reference
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', lineHeight: '1.6' }}>
              Manage your spokes, users, system properties, and analytics from one powerful admin console.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { label: 'Spokes', desc: 'Full CRUD management' },
              { label: 'Users', desc: 'Ban, upgrade, delete' },
              { label: 'Analytics', desc: 'Search insights' },
              { label: 'System', desc: 'DB + Redis + Logs' },
            ].map(f => (
              <div key={f.label} style={{ padding: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '3px' }}>{f.label}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - login form */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
          <div style={{ width: '100%', maxWidth: '380px' }}>
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#e2e8f0', marginBottom: '6px' }}>Sign in to Admin</h1>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Enter your credentials to continue</p>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#2d0a0a', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#9999bb', marginBottom: '6px' }}>Username</label>
                <input type="text" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="admin" autoFocus style={inp()} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#9999bb', marginBottom: '6px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" style={inp({ paddingRight: '40px' })} />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                    {showPass
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: loading ? '#4b5563' : '#6c63ff', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {loading && <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div style={{ marginTop: '32px', padding: '14px', background: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: '8px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '600' }}>Default credentials</p>
              <p style={{ fontSize: '12px', color: '#9999bb', fontFamily: 'monospace' }}>Username: admin</p>
              <p style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>Password: (set in .env.local)</p>
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '24px' }}>
              <a href="/" style={{ color: '#6c63ff', textDecoration: 'none' }}>← Back to snspokes</a>
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });
