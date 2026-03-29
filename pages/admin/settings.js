import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

function Section({ title, icon, children }) {
  return (
    <div style={{ background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', marginBottom: '24px', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>{title}</h3>
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ padding: '4px 10px', background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(108,99,255,0.15)', border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : 'rgba(108,99,255,0.4)'}`, borderRadius: '6px', color: copied ? '#4ade80' : '#8b85ff', fontSize: '12px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', marginLeft: '8px', transition: 'all 0.2s' }}>
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

function EnvRow({ label, value, secret }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #1e1e2e' }}>
      <span style={{ color: '#6b6b8a', fontSize: '13px', minWidth: '180px' }}>{label}</span>
      <code style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#8b85ff', background: '#0a0a14', padding: '4px 10px', borderRadius: '6px', border: '1px solid #1e1e2e' }}>
        {secret ? '••••••••••••' : value}
      </code>
      {!secret && <CopyBtn text={value} />}
    </div>
  );
}

function AdminSettings() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [editPlan, setEditPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      const res = await axios.get('/api/admin/plans');
      setPlans(res.data.plans || []);
    } catch (err) {
      if (err.response?.status === 401) router.push('/admin');
    }
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      await axios.put('/api/admin/plans', editPlan);
      setMsg('Plan updated successfully!');
      setEditPlan(null);
      fetchPlans();
    } catch { setMsg('Failed to update plan'); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '8px', color: '#fff', fontSize: '14px', fontFamily: 'Syne, sans-serif', outline: 'none' };

  return (
    <>
      <Head><title>Settings — Admin snspokes</title></Head>
      <AdminLayout title="Settings">

        {msg && (
          <div style={{ padding: '12px 20px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', color: '#4ade80', marginBottom: '24px', fontSize: '14px' }}>
            ✅ {msg}
          </div>
        )}

        {/* Google OAuth Setup Guide */}
        <Section title="Google OAuth Setup (Login)" icon="🔑">
          <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(108,99,255,0.05)', borderRadius: '12px', border: '1px solid rgba(108,99,255,0.2)' }}>
            <p style={{ color: '#c4c4e0', fontSize: '14px', lineHeight: '1.7' }}>
              Follow these steps to enable Google login on your site. This allows users to sign in with their Google account.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                step: '01', title: 'Go to Google Cloud Console',
                desc: 'Visit console.cloud.google.com and sign in with your Google account.',
                action: { label: 'Open Console', url: 'https://console.cloud.google.com' }
              },
              {
                step: '02', title: 'Create a New Project',
                desc: 'Click "New Project" → Enter name "snspokes" → Click Create. Wait for it to be created.'
              },
              {
                step: '03', title: 'Enable OAuth Consent Screen',
                desc: 'Go to APIs & Services → OAuth consent screen → Select "External" → Fill in App name: "snspokes", User support email, Developer email → Save.'
              },
              {
                step: '04', title: 'Create OAuth Credentials',
                desc: 'Go to APIs & Services → Credentials → Create Credentials → OAuth Client ID → Select "Web application" → Enter name "snspokes web".'
              },
              {
                step: '05', title: 'Add Authorized Redirect URIs',
                desc: 'Add these two redirect URIs in the form:',
                uris: [
                  'http://localhost:3001/api/auth/callback/google',
                  'http://77.42.71.149/api/auth/callback/google'
                ]
              },
              {
                step: '06', title: 'Copy Your Credentials',
                desc: 'After creating, you will see Client ID and Client Secret. Copy both.'
              },
              {
                step: '07', title: 'Add to .env.local on Hetzner',
                desc: 'SSH into your Hetzner server and update the environment:',
                code: 'nano ~/snspokes/.env.local\n\n# Add these lines:\nGOOGLE_CLIENT_ID=your-client-id-here\nGOOGLE_CLIENT_SECRET=your-client-secret-here'
              },
              {
                step: '08', title: 'Rebuild and Test',
                desc: 'Rebuild your Docker container:',
                code: 'cd ~/snspokes\ndocker compose up -d --build nextjs'
              },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px', background: '#0a0a14', borderRadius: '12px', border: '1px solid #1e1e2e' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(108,99,255,0.2)', border: '1px solid rgba(108,99,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#6c63ff', flexShrink: 0 }}>{item.step}</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '6px' }}>{item.title}</h4>
                  <p style={{ color: '#9999bb', fontSize: '13px', lineHeight: '1.6', marginBottom: item.code || item.uris || item.action ? '10px' : 0 }}>{item.desc}</p>
                  {item.uris && item.uris.map(uri => (
                    <div key={uri} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#4ade80', background: '#080810', padding: '4px 10px', borderRadius: '6px', border: '1px solid #1e1e2e', flex: 1 }}>{uri}</code>
                      <CopyBtn text={uri} />
                    </div>
                  ))}
                  {item.code && (
                    <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#a8b2d8', background: '#080810', padding: '12px', borderRadius: '8px', border: '1px solid #1e1e2e', overflow: 'auto', margin: 0 }}>{item.code}</pre>
                  )}
                  {item.action && (
                    <a href={item.action.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: '8px', color: '#8b85ff', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>
                      {item.action.label} ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Current Environment */}
        <Section title="Current Environment Variables" icon="⚙️">
          <p style={{ color: '#6b6b8a', fontSize: '13px', marginBottom: '16px' }}>These are the current settings on your server. To change, edit .env.local on Hetzner and rebuild.</p>
          <EnvRow label="N8N URL" value={process.env.N8N_URL || 'http://snspokes_n8n:5678'} />
          <EnvRow label="Database Host" value={process.env.DB_HOST || 'snspokes_db'} />
          <EnvRow label="Database Name" value={process.env.DB_NAME || 'snspokes'} />
          <EnvRow label="Admin Username" value={process.env.ADMIN_USERNAME || 'admin'} />
          <EnvRow label="Admin Password" value="" secret={true} />
          <EnvRow label="Google OAuth" value={process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Not configured'} />
          <EnvRow label="Razorpay" value={process.env.RAZORPAY_KEY_ID ? '✅ Configured' : '❌ Not configured'} />

          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(251,191,36,0.05)', borderRadius: '10px', border: '1px solid rgba(251,191,36,0.2)' }}>
            <p style={{ color: '#fbbf24', fontSize: '13px' }}>
              💡 To update any setting: SSH to Hetzner → <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', background: '#0a0a14', padding: '2px 6px', borderRadius: '4px' }}>nano ~/snspokes/.env.local</code> → Rebuild with <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', background: '#0a0a14', padding: '2px 6px', borderRadius: '4px' }}>docker compose up -d --build nextjs</code>
            </p>
          </div>
        </Section>

        {/* Pricing Plans */}
        <Section title="Manage Pricing Plans" icon="💰">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {plans.map(plan => (
              <div key={plan.id} style={{ padding: '20px', background: '#0a0a14', borderRadius: '12px', border: '1px solid #1e1e2e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', textTransform: 'capitalize' }}>{plan.name}</h4>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#6c63ff', marginTop: '4px' }}>
                      {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                      {plan.price > 0 && <span style={{ fontSize: '13px', color: '#6b6b8a', fontWeight: '400' }}>/{plan.interval}</span>}
                    </div>
                  </div>
                  <span style={{ padding: '3px 8px', background: plan.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${plan.is_active ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '6px', fontSize: '11px', color: plan.is_active ? '#4ade80' : '#f87171' }}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p style={{ color: '#6b6b8a', fontSize: '12px', marginBottom: '12px' }}>
                  Search limit: {plan.search_limit === -1 ? 'Unlimited' : plan.search_limit + '/day'}
                </p>
                <button onClick={() => setEditPlan({ ...plan, features: Array.isArray(plan.features) ? plan.features.join('\n') : plan.features })}
                  style={{ width: '100%', padding: '8px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '8px', color: '#8b85ff', cursor: 'pointer', fontSize: '13px', fontFamily: 'Syne, sans-serif', fontWeight: '600' }}>
                  ✏️ Edit Plan
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* Razorpay Setup Guide */}
        <Section title="Razorpay Payment Setup" icon="💳">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { step: '01', title: 'Create Razorpay Account', desc: 'Visit razorpay.com and create a business account. Complete KYC verification.', action: { label: 'Open Razorpay', url: 'https://razorpay.com' } },
              { step: '02', title: 'Get API Keys', desc: 'Go to Settings → API Keys → Generate Test Key. Copy Key ID and Key Secret.' },
              { step: '03', title: 'Add to Environment', desc: 'Add to .env.local on Hetzner:', code: 'RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx\nRAZORPAY_KEY_SECRET=your-secret-key' },
              { step: '04', title: 'Test Payments', desc: 'Use test card: 4111 1111 1111 1111, CVV: any 3 digits, Expiry: any future date.' },
              { step: '05', title: 'Go Live', desc: 'After testing, generate Live keys from Razorpay dashboard and replace test keys.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px', background: '#0a0a14', borderRadius: '12px', border: '1px solid #1e1e2e' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#a855f7', flexShrink: 0 }}>{item.step}</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{item.title}</h4>
                  <p style={{ color: '#9999bb', fontSize: '13px', marginBottom: item.code || item.action ? '10px' : 0 }}>{item.desc}</p>
                  {item.code && <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#a8b2d8', background: '#080810', padding: '10px', borderRadius: '8px', border: '1px solid #1e1e2e', margin: 0 }}>{item.code}</pre>}
                  {item.action && <a href={item.action.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', color: '#a855f7', textDecoration: 'none', fontSize: '13px' }}>{item.action.label} ↗</a>}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Quick Commands */}
        <Section title="Quick Server Commands" icon="🖥️">
          <p style={{ color: '#6b6b8a', fontSize: '13px', marginBottom: '16px' }}>Useful commands to manage your Hetzner server without needing to remember them.</p>
          {[
            { label: 'SSH to server', cmd: 'ssh root@77.42.71.149' },
            { label: 'View all containers', cmd: 'docker ps' },
            { label: 'Rebuild frontend', cmd: 'cd ~/snspokes && docker compose up -d --build nextjs' },
            { label: 'View frontend logs', cmd: 'docker logs snspokes_nextjs --tail=50' },
            { label: 'View n8n logs', cmd: 'docker logs snspokes_n8n --tail=50' },
            { label: 'Restart all services', cmd: 'cd ~/snspokes && docker compose restart' },
            { label: 'Pull latest from GitHub', cmd: 'cd ~/snspokes/app && git pull' },
            { label: 'Deploy latest code', cmd: 'cd ~/snspokes/app && git pull && cd .. && docker compose up -d --build nextjs' },
            { label: 'Check Ollama status', cmd: 'systemctl status ollama' },
            { label: 'List Ollama models', cmd: 'ollama list' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #1e1e2e' }}>
              <span style={{ color: '#6b6b8a', fontSize: '13px', minWidth: '200px' }}>{item.label}</span>
              <code style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#a8b2d8', background: '#0a0a14', padding: '6px 12px', borderRadius: '6px', border: '1px solid #1e1e2e' }}>{item.cmd}</code>
              <CopyBtn text={item.cmd} />
            </div>
          ))}
        </Section>

        {/* Edit Plan Modal */}
        {editPlan && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }} onClick={() => setEditPlan(null)}>
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Edit {editPlan.name} Plan</h3>
              {[
                { label: 'Plan Name', key: 'name', type: 'text' },
                { label: 'Price (INR)', key: 'price', type: 'number' },
                { label: 'Search Limit (-1 = unlimited)', key: 'search_limit', type: 'number' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#9999bb', fontSize: '13px', marginBottom: '6px' }}>{f.label}</label>
                  <input type={f.type} value={editPlan[f.key] || ''} onChange={e => setEditPlan({ ...editPlan, [f.key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#9999bb', fontSize: '13px', marginBottom: '6px' }}>Features (one per line)</label>
                <textarea value={editPlan.features || ''} onChange={e => setEditPlan({ ...editPlan, features: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="is_active" checked={editPlan.is_active} onChange={e => setEditPlan({ ...editPlan, is_active: e.target.checked })} />
                <label htmlFor="is_active" style={{ color: '#9999bb', fontSize: '14px', cursor: 'pointer' }}>Plan is active</label>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setEditPlan(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#9999bb', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Cancel</button>
                <button onClick={savePlan} disabled={saving} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: '600', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(AdminSettings);
