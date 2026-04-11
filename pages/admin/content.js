import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

const h = () => ({ 'Content-Type':'application/json', 'x-admin-token': getAdminToken() });

const CATEGORIES = ['Integration','Authentication','Communication','Cloud','DevOps','ITSM','Security','Other'];

function AdminContent() {
  const [spokes,   setSpokes]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState('');
  const [filter,   setFilter]  = useState('');
  const [page,     setPage]    = useState(1);
  const [total,    setTotal]   = useState(0);
  const [toast,    setToast]   = useState(null);
  const [editId,   setEditId]  = useState(null);
  const [editForm, setEditForm]= useState({});

  const showToast = (t, type='success') => { setToast({t,type}); setTimeout(()=>setToast(null),3000); };

  const fetch_ = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/spokes?page=${page}&limit=20&search=${encodeURIComponent(search)}&category=${filter}`, { headers: h() });
      const d = await r.json();
      if (d.success) { setSpokes(d.spokes||[]); setTotal(d.total||0); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, [page, filter]);

  const toggleActive = async (id, current) => {
    try {
      const r = await fetch('/api/admin/spokes', { method:'PUT', headers:h(), body: JSON.stringify({ id, is_active: !current }) });
      const d = await r.json();
      if (d.success) { showToast(!current ? 'Spoke activated' : 'Spoke deactivated'); fetch_(); }
      else showToast(d.error||'Failed','error');
    } catch { showToast('Failed','error'); }
  };

  const saveEdit = async () => {
    try {
      const r = await fetch('/api/admin/spokes', { method:'PUT', headers:h(), body: JSON.stringify({ id:editId, ...editForm }) });
      const d = await r.json();
      if (d.success) { showToast('Spoke updated'); setEditId(null); fetch_(); }
      else showToast(d.error||'Failed','error');
    } catch { showToast('Failed','error'); }
  };

  const deleteSpoke = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const r = await fetch('/api/admin/spokes', { method:'DELETE', headers:h(), body: JSON.stringify({ id }) });
      const d = await r.json();
      if (d.success) { showToast('Spoke deleted'); fetch_(); }
      else showToast(d.error||'Failed','error');
    } catch { showToast('Failed','error'); }
  };

  const enrichSpoke = async (slug, name) => {
    showToast(`Enriching ${name} with AI...`);
    try {
      const r = await fetch('/api/admin/seed-spokes', { method:'POST', headers:h(), body: JSON.stringify({ slug, action:'enrich' }) });
      const d = await r.json();
      if (d.success) { showToast(`✓ ${name} enriched • ${d.model||'AI'}`); fetch_(); }
      else showToast(d.error||'Enrichment failed','error');
    } catch { showToast('Failed','error'); }
  };

  const inp = { width:'100%', padding:'8px 10px', background:'#06060e', border:'1px solid #1a1a2e', borderRadius:'7px', color:'#e2e8f0', fontSize:'13px', fontFamily:"'DM Sans',sans-serif", outline:'none' };
  const lbl = { fontSize:'11px', color:'#4b5563', display:'block', marginBottom:'4px', fontFamily:"'JetBrains Mono',monospace", textTransform:'uppercase', letterSpacing:'.5px' };

  return (
    <>
      <Head><title>Content Control — snspokes Admin</title></Head>
      <AdminLayout title="Content Control" breadcrumbs={['Content']}>
        <div style={{ padding:'24px 28px' }}>

          {toast && (
            <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:9999, padding:'10px 18px', background:toast.type==='error'?'#2d0a0a':'#0a1a12', border:`1px solid ${toast.type==='error'?'rgba(248,113,113,.3)':'rgba(74,222,128,.3)'}`, borderRadius:'10px', color:toast.type==='error'?'#f87171':'#4ade80', fontSize:'13px', fontFamily:"'JetBrains Mono',monospace" }}>
              {toast.t}
            </div>
          )}

          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
            <div>
              <h1 style={{ fontSize:'20px', fontWeight:700, color:'#f0f4ff', margin:0, fontFamily:"'Bricolage Grotesque',sans-serif" }}>Content Control</h1>
              <p style={{ color:'#2a2a3a', fontSize:'11px', marginTop:'3px', fontFamily:"'JetBrains Mono',monospace" }}>{total} spokes indexed</p>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={async () => {
                showToast('Bulk enriching empty spokes...');
                const r = await fetch('/api/admin/seed-spokes', { method:'POST', headers:h(), body: JSON.stringify({ action:'bulk' }) });
                const d = await r.json();
                showToast(d.success ? `✓ Enriched ${d.enriched} spokes` : d.error||'Failed', d.success?'success':'error');
                fetch_();
              }} style={{ padding:'8px 14px', background:'rgba(108,99,255,.1)', border:'1px solid rgba(108,99,255,.2)', borderRadius:'8px', color:'#8b85ff', fontSize:'12px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
                ⟡ AI Enrich Empty
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'){setPage(1);fetch_();}}}
              placeholder="search spokes..." style={{ ...inp, width:'220px', flex:'none' }} />
            <select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}} style={{ ...inp, width:'160px', flex:'none' }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <button onClick={()=>{setPage(1);fetch_();}} style={{ padding:'8px 16px', background:'rgba(108,99,255,.1)', border:'1px solid rgba(108,99,255,.2)', borderRadius:'8px', color:'#8b85ff', fontSize:'12px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
              search
            </button>
          </div>

          {/* Edit modal */}
          {editId && (
            <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.7)', backdropFilter:'blur(6px)' }}>
              <div style={{ background:'#0a0a14', border:'1px solid #1a1a2e', borderRadius:'16px', padding:'28px', width:'500px', maxWidth:'calc(100vw-32px)' }}>
                <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'16px', fontWeight:700, color:'#f0f4ff', marginBottom:'20px' }}>Edit Spoke</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div><label style={lbl}>Name</label><input value={editForm.name||''} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} style={inp}/></div>
                  <div><label style={lbl}>Description</label><textarea value={editForm.description||''} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} rows={3} style={{...inp,resize:'vertical'}}/></div>
                  <div><label style={lbl}>Category</label>
                    <select value={editForm.category||''} onChange={e=>setEditForm(f=>({...f,category:e.target.value}))} style={inp}>
                      {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Icon</label><input value={editForm.icon||''} onChange={e=>setEditForm(f=>({...f,icon:e.target.value}))} style={{...inp,width:'80px'}} placeholder="💬"/></div>
                </div>
                <div style={{ display:'flex', gap:'8px', marginTop:'20px' }}>
                  <button onClick={saveEdit} style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>Save Changes</button>
                  <button onClick={()=>setEditId(null)} style={{ padding:'10px 16px', background:'transparent', border:'1px solid #1a1a2e', borderRadius:'8px', color:'#6b7280', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #0d0d18' }}>
                  {['Spoke','Category','Status','Content','Views','Actions'].map(h=>(
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:'#374151', fontSize:'11px', fontFamily:"'JetBrains Mono',monospace", textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(8).fill(0).map((_,i)=>(
                    <tr key={i}><td colSpan={6} style={{ padding:'12px 16px' }}><div className="skeleton" style={{ height:'14px', borderRadius:'4px' }}/></td></tr>
                  ))
                ) : spokes.map(s=>(
                  <tr key={s.id} style={{ borderBottom:'1px solid #0d0d18', transition:'background .1s' }}
                    onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,.01)'}
                    onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'16px' }}>{s.icon||'🔌'}</span>
                        <div>
                          <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600 }}>{s.name}</div>
                          <div style={{ color:'#374151', fontSize:'10.5px', fontFamily:"'JetBrains Mono',monospace" }}>{s.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'11px 16px', color:'#6b7280', fontSize:'12px' }}>{s.category||'—'}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <button onClick={()=>toggleActive(s.id, s.is_active)}
                        style={{ padding:'3px 10px', background:s.is_active?'rgba(74,222,128,.1)':'rgba(248,113,113,.1)', border:`1px solid ${s.is_active?'rgba(74,222,128,.2)':'rgba(248,113,113,.2)'}`, borderRadius:'20px', color:s.is_active?'#4ade80':'#f87171', fontSize:'11px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>
                        {s.is_active?'active':'inactive'}
                      </button>
                    </td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ fontSize:'11px', color: s.ai_description?'#4ade80':'#f59e0b', fontFamily:"'JetBrains Mono',monospace" }}>
                        {s.ai_description?'✓ enriched':'○ empty'}
                      </span>
                    </td>
                    <td style={{ padding:'11px 16px', color:'#4b5563', fontSize:'12px', fontFamily:"'JetBrains Mono',monospace" }}>{s.view_count||0}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ display:'flex', gap:'5px' }}>
                        <button onClick={()=>{ setEditId(s.id); setEditForm({ name:s.name, description:s.description, category:s.category, icon:s.icon }); }}
                          style={{ padding:'4px 8px', background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.15)', borderRadius:'6px', color:'#8b85ff', fontSize:'11px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>edit</button>
                        {!s.ai_description && (
                          <button onClick={()=>enrichSpoke(s.slug, s.name)}
                            style={{ padding:'4px 8px', background:'rgba(16,185,129,.07)', border:'1px solid rgba(16,185,129,.15)', borderRadius:'6px', color:'#10b981', fontSize:'11px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>enrich</button>
                        )}
                        <button onClick={()=>deleteSpoke(s.id, s.name)}
                          style={{ padding:'4px 8px', background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.15)', borderRadius:'6px', color:'#f87171', fontSize:'11px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && spokes.length === 0 && (
              <p style={{ textAlign:'center', padding:'40px', color:'#2a2a3a', fontFamily:"'JetBrains Mono',monospace", fontSize:'12px' }}>no_results</p>
            )}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginTop:'16px' }}>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{ padding:'6px 14px', background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'7px', color:page===1?'#2a2a3a':'#9ca3af', cursor:page===1?'default':'pointer', fontFamily:"'JetBrains Mono',monospace", fontSize:'12px' }}>← prev</button>
              <span style={{ padding:'6px 14px', color:'#4b5563', fontFamily:"'JetBrains Mono',monospace", fontSize:'12px' }}>page {page} of {Math.ceil(total/20)}</span>
              <button disabled={page>=Math.ceil(total/20)} onClick={()=>setPage(p=>p+1)} style={{ padding:'6px 14px', background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'7px', color:page>=Math.ceil(total/20)?'#2a2a3a':'#9ca3af', cursor:page>=Math.ceil(total/20)?'default':'pointer', fontFamily:"'JetBrains Mono',monospace", fontSize:'12px' }}>next →</button>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

export default withAdminPage(AdminContent);
export const getServerSideProps = async () => ({ props: {} });
