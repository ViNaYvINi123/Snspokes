import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AdminPromoCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code:'', type:'free_months', value:'1', max_uses:'', expires_days:'30', plan_override:'pro' });
  const [msg, setMsg] = useState(null);

  const headers = { 'Content-Type':'application/json', 'x-admin-token': getAdminToken() };

  useEffect(() => {
    fetch('/api/admin/promo-codes', { headers }).then(r => r.json()).then(d => { if (d.success) setCodes(d.codes); }).catch(()=>{}).finally(() => setLoading(false));
  }, []);

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const create = async () => {
    const r = await fetch('/api/admin/promo-codes', { method:'POST', headers, body: JSON.stringify({ action:'create', ...form }) });
    const d = await r.json();
    if (d.success) { showMsg(`Created: ${d.code}`); setForm({ code:'', type:'free_months', value:'1', max_uses:'', expires_days:'30', plan_override:'pro' }); }
  };

  const deactivate = async (id) => {
    await fetch('/api/admin/promo-codes', { method:'DELETE', headers, body: JSON.stringify({ id }) });
    setCodes(prev => prev.filter(c => c.id !== id));
  };

  const inp = { background:'#111827', border:'1px solid #1e1e2e', borderRadius:'8px', padding:'8px 12px', color:'#e2e8f0', fontSize:'13px', fontFamily:'inherit', outline:'none' };

  return (
    <>
      <Head><title>Promo Codes — snspokes Admin</title></Head>
      <AdminLayout title="Promo Codes">
        <div style={{ padding:'24px' }}>
          {msg && <div style={{ position:'fixed', top:'80px', right:'24px', padding:'12px 20px', background:'#052e16', border:'1px solid #16a34a', borderRadius:'10px', color:'#4ade80', fontSize:'13px', zIndex:999 }}>{msg.text}</div>}

          <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:'0 0 20px' }}>🎟️ Promo Codes</h1>

          {/* Create form */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'20px', marginBottom:'24px' }}>
            <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 16px' }}>Create New Code</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'12px' }}>
              <div>
                <label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>CODE (leave blank for random)</label>
                <input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value.toUpperCase()}))} placeholder="e.g. LAUNCH50" style={inp} />
              </div>
              <div>
                <label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>TYPE</label>
                <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))} style={inp}>
                  <option value="free_months">Free Months</option>
                  <option value="plan_upgrade">Plan Upgrade</option>
                  <option value="percentage">Percentage Discount</option>
                </select>
              </div>
              <div>
                <label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>VALUE</label>
                <input value={form.value} onChange={e => setForm(p => ({...p, value: e.target.value}))} placeholder="e.g. 1 (month) or 50 (%) " style={inp} />
              </div>
              <div>
                <label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>MAX USES (blank = unlimited)</label>
                <input value={form.max_uses} onChange={e => setForm(p => ({...p, max_uses: e.target.value}))} placeholder="e.g. 100" style={inp} />
              </div>
              <div>
                <label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>EXPIRES IN (days)</label>
                <input value={form.expires_days} onChange={e => setForm(p => ({...p, expires_days: e.target.value}))} placeholder="e.g. 30" style={inp} />
              </div>
              {form.type === 'plan_upgrade' && (
                <div>
                  <label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>TARGET PLAN</label>
                  <select value={form.plan_override} onChange={e => setForm(p => ({...p, plan_override: e.target.value}))} style={inp}>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              )}
            </div>
            <button onClick={create} style={{ padding:'8px 20px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>+ Create Code</button>
          </div>

          {/* Codes table */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #1e1e2e', background:'#111827' }}>
                  {['Code','Type','Value','Uses','Expires','Status','Action'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map(c => (
                  <tr key={c.id} style={{ borderBottom:'1px solid #1e1e2e22', opacity: c.active ? 1 : 0.5 }}>
                    <td style={{ padding:'10px 16px' }}><code style={{ background:'#1e1e2e', padding:'2px 8px', borderRadius:'4px', color:'#6c63ff', fontSize:'12px' }}>{c.code}</code></td>
                    <td style={{ padding:'10px 16px', color:'#9999bb', textTransform:'capitalize' }}>{c.type?.replace('_',' ')}</td>
                    <td style={{ padding:'10px 16px', color:'#4ade80', fontWeight:'600' }}>{c.value} {c.type === 'free_months' ? 'month(s)' : c.type === 'percentage' ? '%' : `→ ${c.plan_override}`}</td>
                    <td style={{ padding:'10px 16px', color:'#e2e8f0' }}>{c.uses || 0} {c.max_uses ? `/ ${c.max_uses}` : '/ ∞'}</td>
                    <td style={{ padding:'10px 16px', color:'#6b7280' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</td>
                    <td style={{ padding:'10px 16px' }}><span style={{ color: c.active ? '#4ade80' : '#f87171', fontSize:'12px' }}>● {c.active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ padding:'10px 16px' }}>
                      {c.active && <button onClick={() => deactivate(c.id)} style={{ padding:'3px 10px', background:'#FF6B6B22', border:'1px solid #FF6B6B44', borderRadius:'6px', color:'#FF6B6B', fontSize:'11px', cursor:'pointer' }}>Deactivate</button>}
                    </td>
                  </tr>
                ))}
                {!loading && codes.length === 0 && <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:'#6b7280' }}>No promo codes yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export default withAdminPage(AdminPromoCodes);

export const getServerSideProps = async () => ({ props: {} });
