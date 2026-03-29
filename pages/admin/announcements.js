import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

const TYPE_COLORS = { info:'#2563eb', warning:'#d97706', success:'#16a34a', promo:'#7c3aed' };
const EMPTY = { title:'', message:'', type:'info', target:'all', cta_text:'', cta_url:'', ends_at:'' };

function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type='success') => { setToast({text,type}); setTimeout(()=>setToast(null),3500); };

  const fetch = async () => {
    try { const r = await axios.get('/api/admin/announcements'); setAnnouncements(r.data.announcements||[]); } catch {}
  };
  useEffect(()=>{ fetch(); },[]);

  const save = async () => {
    if (!form.title?.trim()||!form.message?.trim()) { showToast('Title and message required','error'); return; }
    setSaving(true);
    try {
      await axios.post('/api/admin/announcements', form);
      showToast('Announcement created');
      setForm(EMPTY); fetch();
    } catch(err) { showToast(err.response?.data?.error||'Failed','error'); }
    finally { setSaving(false); }
  };

  const toggle = async (id, is_active) => {
    await axios.patch('/api/admin/announcements', {id, is_active: !is_active});
    fetch();
  };

  const del = async (id) => {
    if (!confirm('Delete?')) return;
    await axios.delete('/api/admin/announcements', {data:{id}});
    showToast('Deleted'); fetch();
  };

  const inp = { width:'100%', padding:'8px 10px', border:'1px solid #1e1e2e', borderRadius:'7px', fontSize:'13px', fontFamily:'inherit', outline:'none' };
  const lbl = { fontSize:'11px', fontWeight:'600', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'4px' };

  return (
    <>
      <Head><title>Announcements — snspokes Admin</title></Head>
      <AdminLayout title="Announcement System" breadcrumbs={['Announcements']}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
          {/* Create form */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e1e2e' }}><h3 style={{ fontSize:'13px', fontWeight:'600', color:'#e2e8f0', margin:0 }}>📢 New Announcement</h3></div>
            <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>
              <div><label style={lbl}>Title *</label><input style={inp} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="🚀 New feature launched!" /></div>
              <div><label style={lbl}>Message *</label><textarea style={{...inp,resize:'vertical'}} rows={3} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Describe the announcement..." /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div><label style={lbl}>Type</label>
                  <select style={inp} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                    <option value="info">ℹ️ Info</option><option value="warning">⚠️ Warning</option><option value="success">✅ Success</option><option value="promo">🎉 Promo</option>
                  </select></div>
                <div><label style={lbl}>Target</label>
                  <select style={inp} value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))}>
                    <option value="all">All Users</option><option value="free">Free Only</option><option value="pro">Pro Only</option><option value="team">Team Only</option>
                  </select></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div><label style={lbl}>CTA Button Text</label><input style={inp} value={form.cta_text} onChange={e=>setForm(f=>({...f,cta_text:e.target.value}))} placeholder="Learn More" /></div>
                <div><label style={lbl}>CTA URL</label><input style={inp} value={form.cta_url} onChange={e=>setForm(f=>({...f,cta_url:e.target.value}))} placeholder="/tools/query-builder" /></div>
              </div>
              <div><label style={lbl}>Expires At (optional)</label><input style={inp} type="datetime-local" value={form.ends_at} onChange={e=>setForm(f=>({...f,ends_at:e.target.value}))} /></div>
              <button onClick={save} disabled={saving} style={{ padding:'10px', background:'#e2e8f0', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>
                {saving ? 'Saving...' : '📢 Publish Announcement'}
              </button>
            </div>
          </div>

          {/* Active announcements */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e1e2e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ fontSize:'13px', fontWeight:'600', color:'#e2e8f0', margin:0 }}>Active Announcements ({announcements.length})</h3>
            </div>
            <div>
              {announcements.length === 0 ? (
                <div style={{ padding:'40px', textAlign:'center', color:'#9ca3af', fontSize:'13px' }}>No announcements yet</div>
              ) : announcements.map(a => (
                <div key={a.id} style={{ padding:'14px 16px', borderBottom:'1px solid #1e1e2e', opacity: a.is_active ? 1 : 0.5 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                    <div>
                      <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700', background:`${TYPE_COLORS[a.type]}15`, color:TYPE_COLORS[a.type], border:`1px solid ${TYPE_COLORS[a.type]}30`, marginBottom:'5px' }}>{a.type}</span>
                      <div style={{ fontSize:'13px', fontWeight:'600', color:'#e2e8f0' }}>{a.title}</div>
                      <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'2px' }}>{a.message.substring(0,80)}...</div>
                    </div>
                    <div style={{ display:'flex', gap:'6px', flexShrink:0, marginLeft:'10px' }}>
                      <button onClick={()=>toggle(a.id,a.is_active)} style={{ padding:'4px 10px', background: a.is_active ? '#2d0a0a' : '#052e16', border:`1px solid ${a.is_active ? '#fecaca' : '#bbf7d0'}`, borderRadius:'6px', fontSize:'11px', cursor:'pointer', color: a.is_active ? '#dc2626' : '#16a34a', fontFamily:'inherit', fontWeight:'600' }}>
                        {a.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={()=>del(a.id)} style={{ padding:'4px 8px', background:'#2d0a0a', border:'1px solid #fecaca', borderRadius:'6px', fontSize:'11px', cursor:'pointer', color:'#dc2626' }}>×</button>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px', fontSize:'11px', color:'#9ca3af' }}>
                    <span>Target: {a.target}</span>
                    {a.cta_text && <span>CTA: {a.cta_text}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {toast && <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:9999, padding:'12px 18px', borderRadius:'10px', background: toast.type==='error' ? '#2d0a0a' : '#052e16', border:`1px solid ${toast.type==='error' ? '#fecaca' : '#bbf7d0'}`, color: toast.type==='error' ? '#dc2626' : '#16a34a', fontSize:'13px', fontWeight:'500', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>{toast.type==='error'?'⚠️':'✅'} {toast.text}</div>}
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(AdminAnnouncements);
