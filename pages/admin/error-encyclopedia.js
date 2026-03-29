import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AdminErrorEncyclopedia() {
  const [errors, setErrors] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ error_pattern:'', title:'', description:'', root_cause:'', fix_steps:'', category:'', severity:'medium', verified:true });
  const headers = { 'Content-Type':'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' };

  useEffect(() => {
    fetch(`/api/admin/error-encyclopedia${search ? `?search=${encodeURIComponent(search)}` : ''}`, { headers: { 'x-admin-token': localStorage.getItem('admin_token') || '' } })
      .then(r => r.json()).then(d => { if (d.success) { setErrors(d.errors); setTotal(d.total); } });
  }, [search]);

  const save = async () => {
    const body = { ...form, fix_steps: form.fix_steps.split('\n').filter(Boolean) };
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { ...body, id: editing.id } : body;
    await fetch('/api/admin/error-encyclopedia', { method, headers, body: JSON.stringify(payload) });
    setShowForm(false); setEditing(null);
    setForm({ error_pattern:'', title:'', description:'', root_cause:'', fix_steps:'', category:'', severity:'medium', verified:true });
    // Refresh
    fetch('/api/admin/error-encyclopedia', { headers: { 'x-admin-token': localStorage.getItem('admin_token') || '' } })
      .then(r => r.json()).then(d => { if (d.success) setErrors(d.errors); });
  };

  const del = async (id) => {
    if (!confirm('Delete this error?')) return;
    await fetch('/api/admin/error-encyclopedia', { method:'DELETE', headers, body: JSON.stringify({ id }) });
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  const startEdit = (err) => {
    setEditing(err);
    setForm({ ...err, fix_steps: Array.isArray(err.fix_steps) ? err.fix_steps.join('\n') : '' });
    setShowForm(true);
  };

  const inp = { width:'100%', background:'#111827', border:'1px solid #1e1e2e', borderRadius:'8px', padding:'8px 12px', color:'#e2e8f0', fontSize:'13px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
  const SEV_COLORS = { low:'#4ade80', medium:'#FFB347', high:'#f87171', critical:'#dc2626' };

  return (
    <>
      <Head><title>Error Encyclopedia — snspokes Admin</title></Head>
      <AdminLayout title="Error Encyclopedia">
        <div style={{ padding:'24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
            <div>
              <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:0 }}>🐛 Error Encyclopedia</h1>
              <p style={{ color:'#6b7280', fontSize:'12px', marginTop:'3px' }}>{total} errors in database</p>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search errors..." style={{ ...inp, width:'220px' }} />
              <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>+ Add Error</button>
            </div>
          </div>

          {/* Add/Edit form */}
          {showForm && (
            <div style={{ background:'#0f0f1a', border:'1px solid #6c63ff44', borderRadius:'12px', padding:'20px', marginBottom:'20px' }}>
              <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 16px' }}>{editing ? 'Edit Error' : 'Add New Error'}</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                <div><label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>ERROR PATTERN</label><input value={form.error_pattern} onChange={e => setForm(p => ({...p, error_pattern:e.target.value}))} placeholder="e.g. GlideRecord.setLimit is deprecated" style={inp} /></div>
                <div><label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>TITLE</label><input value={form.title} onChange={e => setForm(p => ({...p, title:e.target.value}))} placeholder="Short descriptive title" style={inp} /></div>
                <div><label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>CATEGORY</label><input value={form.category} onChange={e => setForm(p => ({...p, category:e.target.value}))} placeholder="e.g. GlideRecord, Flow Designer" style={inp} /></div>
                <div><label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>SEVERITY</label><select value={form.severity} onChange={e => setForm(p => ({...p, severity:e.target.value}))} style={inp}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
              </div>
              <div style={{ marginBottom:'12px' }}><label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>DESCRIPTION</label><textarea value={form.description} onChange={e => setForm(p => ({...p, description:e.target.value}))} rows={2} style={inp} /></div>
              <div style={{ marginBottom:'12px' }}><label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>ROOT CAUSE</label><textarea value={form.root_cause} onChange={e => setForm(p => ({...p, root_cause:e.target.value}))} rows={2} style={inp} /></div>
              <div style={{ marginBottom:'16px' }}><label style={{ color:'#6b7280', fontSize:'11px', display:'block', marginBottom:'4px' }}>FIX STEPS (one per line)</label><textarea value={form.fix_steps} onChange={e => setForm(p => ({...p, fix_steps:e.target.value}))} rows={4} placeholder="Step 1: Check your configuration&#10;Step 2: Verify the API version&#10;Step 3: Test with a minimal example" style={inp} /></div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={save} style={{ padding:'8px 20px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>{editing ? 'Save Changes' : 'Add Error'}</button>
                <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ padding:'8px 16px', background:'#1e1e2e', border:'1px solid #2a2a3e', borderRadius:'8px', color:'#9999bb', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Errors table */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ borderBottom:'1px solid #1e1e2e', background:'#111827' }}>
                {['Title','Pattern','Category','Severity','Views','Actions'].map(h => <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {errors.map(e => (
                  <tr key={e.id} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                    <td style={{ padding:'10px 16px', color:'#e2e8f0', fontWeight:'600', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.title}</td>
                    <td style={{ padding:'10px 16px', color:'#6b7280', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}><code style={{ fontSize:'11px' }}>{e.error_pattern}</code></td>
                    <td style={{ padding:'10px 16px', color:'#9999bb' }}>{e.category}</td>
                    <td style={{ padding:'10px 16px' }}><span style={{ background:`${SEV_COLORS[e.severity]||'#6b7280'}22`, color:SEV_COLORS[e.severity]||'#6b7280', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', textTransform:'capitalize' }}>{e.severity}</span></td>
                    <td style={{ padding:'10px 16px', color:'#6b7280' }}>{e.view_count || 0}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={() => startEdit(e)} style={{ padding:'3px 10px', background:'#6c63ff22', border:'1px solid #6c63ff44', borderRadius:'6px', color:'#6c63ff', fontSize:'11px', cursor:'pointer' }}>Edit</button>
                        <button onClick={() => del(e.id)} style={{ padding:'3px 10px', background:'#FF6B6B22', border:'1px solid #FF6B6B44', borderRadius:'6px', color:'#FF6B6B', fontSize:'11px', cursor:'pointer' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {errors.length === 0 && <tr><td colSpan={6} style={{ padding:'40px', textAlign:'center', color:'#6b7280' }}>No errors in encyclopedia yet. Add the first one!</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
export default withAdminPage(AdminErrorEncyclopedia);
