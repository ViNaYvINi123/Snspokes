import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AdminBroadcast() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState('all');
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);
  const headers = { 'Content-Type':'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' };

  const SEGMENTS = [
    { value:'all', label:'All Users', desc:'Everyone registered' },
    { value:'free', label:'Free Users', desc:'On free plan' },
    { value:'paying', label:'Paying Users', desc:'Pro + Enterprise' },
    { value:'pro', label:'Pro Users', desc:'Pro plan only' },
    { value:'enterprise', label:'Enterprise', desc:'Enterprise plan only' },
    { value:'inactive_30', label:'Inactive 30d', desc:'Not logged in for 30 days' },
    { value:'new_7', label:'New this week', desc:'Registered in last 7 days' },
    { value:'never_searched', label:'Never Searched', desc:'Registered but never searched' },
  ];

  const getPreview = async () => {
    const r = await fetch(`/api/admin/broadcast?segment=${segment}`, { headers: { 'x-admin-token': localStorage.getItem('admin_token') || '' } });
    const d = await r.json();
    if (d.success) setPreview(d.count);
  };

  useEffect(() => { getPreview(); }, [segment]);

  const send = async () => {
    if (!subject || !body) return;
    if (!confirm(`Send to ${preview} users? This cannot be undone.`)) return;
    setSending(true);
    const r = await fetch('/api/admin/broadcast', { method:'POST', headers, body: JSON.stringify({ subject, body, segment }) });
    const d = await r.json();
    if (d.success) { setMsg({ text:`✅ Queued ${d.queued} emails`, type:'success' }); setSubject(''); setBody(''); }
    else setMsg({ text:`❌ ${d.error}`, type:'error' });
    setSending(false);
    setTimeout(() => setMsg(null), 4000);
  };

  const inp = { width:'100%', background:'#111827', border:'1px solid #1e1e2e', borderRadius:'8px', padding:'10px 14px', color:'#e2e8f0', fontSize:'13px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

  return (
    <>
      <Head><title>Broadcast Email — snspokes Admin</title></Head>
      <AdminLayout title="Broadcast Email">
        <div style={{ padding:'24px', maxWidth:'900px' }}>
          {msg && <div style={{ marginBottom:'16px', padding:'12px 20px', background: msg.type==='success'?'#052e16':'#2d0a0a', border:`1px solid ${msg.type==='success'?'#16a34a':'#dc2626'}`, borderRadius:'10px', color: msg.type==='success'?'#4ade80':'#f87171', fontSize:'13px' }}>{msg.text}</div>}

          <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:'0 0 20px' }}>📨 Broadcast Email</h1>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'20px' }}>
            {/* Segment picker */}
            <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'20px' }}>
              <h3 style={{ color:'#fff', fontSize:'13px', fontWeight:'700', margin:'0 0 12px' }}>1. Choose Segment</h3>
              {SEGMENTS.map(s => (
                <label key={s.value} style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px', borderRadius:'8px', cursor:'pointer', marginBottom:'4px', background: segment===s.value?'#6c63ff22':'transparent', border:`1px solid ${segment===s.value?'#6c63ff44':'transparent'}` }}>
                  <input type="radio" value={s.value} checked={segment===s.value} onChange={() => setSegment(s.value)} style={{ marginTop:'2px', accentColor:'#6c63ff' }} />
                  <div>
                    <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'600' }}>{s.label}</div>
                    <div style={{ color:'#6b7280', fontSize:'11px' }}>{s.desc}</div>
                  </div>
                </label>
              ))}
              <div style={{ marginTop:'16px', padding:'12px', background:'#6c63ff11', border:'1px solid #6c63ff33', borderRadius:'8px', textAlign:'center' }}>
                <div style={{ fontSize:'24px', fontWeight:'800', color:'#6c63ff' }}>{preview ?? '...'}</div>
                <div style={{ fontSize:'11px', color:'#6b7280' }}>recipients</div>
              </div>
            </div>

            {/* Email composer */}
            <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'20px' }}>
              <h3 style={{ color:'#fff', fontSize:'13px', fontWeight:'700', margin:'0 0 16px' }}>2. Compose Email</h3>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>SUBJECT LINE</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. New features in snspokes 🚀" style={inp} />
              </div>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>EMAIL BODY (HTML supported · use {'{{name}}'} for personalization)</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={`Hi {{name}},\n\nWe've just launched...\n\nBest,\nsnspokes Team`} rows={10} style={{ ...inp, resize:'vertical' }} />
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={send} disabled={sending || !subject || !body} style={{ flex:1, padding:'10px', background: sending || !subject || !body ? '#1e1e2e' : 'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'8px', color: sending || !subject || !body ? '#6b7280' : '#fff', fontSize:'14px', fontWeight:'700', cursor: sending || !subject || !body ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
                  {sending ? '⏳ Queuing...' : `📨 Send to ${preview ?? '?'} users`}
                </button>
              </div>
              <p style={{ color:'#4b4b6a', fontSize:'11px', marginTop:'8px' }}>Emails are queued and sent via the email queue. Large sends may take a few minutes.</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(AdminBroadcast);
