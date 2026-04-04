import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

const EMPTY = { version:'', date: new Date().toISOString().split('T')[0], type:'feature', title:'', changes:[] };
const TYPES = ['launch','feature','fix','security'];

function AdminChangelog() {
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [msg,  setMsg]        = useState(null);
  const h = { 'Content-Type':'application/json', 'x-admin-token': localStorage.getItem('admin_token')||'' };

  const load = () =>
    fetch('/api/changelog', { headers: h }).then(r => r.json())
      .then(d => setEntries(d.entries || [])).catch(()=>{});

  useEffect(() => { load(); }, []);
  const showMsg = (t, type='success') => { setMsg({t,type}); setTimeout(()=>setMsg(null),3000); };

  const save = async () => {
    const all = editing !== null
      ? entries.map((e,i) => i===editing ? form : e)
      : [form, ...entries];
    const r = await fetch('/api/admin/changelog', { method:'POST', headers:h, body: JSON.stringify({ entries: all }) });
    const d = await r.json();
    if (d.success) { showMsg('Saved!'); setEditing(null); setForm(EMPTY); load(); }
    else showMsg(d.error||'Failed','error');
  };

  const del = async (i) => {
    if (!confirm('Delete this entry?')) return;
    const all = entries.filter((_,idx) => idx!==i);
    await fetch('/api/admin/changelog', { method:'POST', headers:h, body: JSON.stringify({ entries: all }) });
    load();
  };

  const startEdit = (i) => { setEditing(i); setForm({ ...entries[i], changes: entries[i].changes || [] }); };

  const addChange = () => setForm(f => ({ ...f, changes: [...f.changes, { type:'new', text:'' }] }));
  const updChange = (i, k, v) => setForm(f => ({ ...f, changes: f.changes.map((c,ci) => ci===i ? {...c,[k]:v} : c) }));
  const delChange = (i) => setForm(f => ({ ...f, changes: f.changes.filter((_,ci) => ci!==i) }));

  const s = {
    inp: { width:'100%', background:'#111827', border:'1px solid #1e1e2e', borderRadius:'8px', padding:'8px 12px', color:'#e2e8f0', fontSize:'13px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
    btn: { padding:'7px 16px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' },
    sm:  { padding:'4px 10px', background:'#1e1e2e', border:'1px solid #2a2a3e', borderRadius:'6px', color:'#9999bb', fontSize:'11px', cursor:'pointer', fontFamily:'inherit' },
    del: { padding:'4px 10px', background:'#2d0a0a', border:'1px solid #ef444433', borderRadius:'6px', color:'#f87171', fontSize:'11px', cursor:'pointer', fontFamily:'inherit' },
  };
  const lbl = { fontSize:'11px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'4px' };

  return (
    <>
      <Head><title>Changelog — snspokes Admin</title></Head>
      <AdminLayout title="Changelog Manager">
        <div style={{ padding:'24px', maxWidth:'860px' }}>
          {msg && <div style={{ marginBottom:'16px', padding:'10px 16px', background: msg.type==='success'?'#052e16':'#2d0a0a', border:`1px solid ${msg.type==='success'?'#16a34a':'#ef4444'}`, borderRadius:'10px', color: msg.type==='success'?'#4ade80':'#f87171', fontSize:'13px' }}>{msg.t}</div>}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
            <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:0 }}>📋 Changelog Manager</h1>
            <button onClick={() => { setEditing(null); setForm(EMPTY); }} style={s.btn}>+ New Entry</button>
          </div>

          {/* Form */}
          {(editing !== null || form.title !== '' || form.version !== '') && (
            <div style={{ background:'#0f0f1a', border:'1px solid #6c63ff44', borderRadius:'12px', padding:'20px', marginBottom:'20px' }}>
              <h3 style={{ color:'#fff', fontSize:'13px', fontWeight:'700', margin:'0 0 16px' }}>{editing!==null?'Edit Entry':'New Entry'}</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'10px', marginBottom:'12px' }}>
                <div><label style={lbl}>Version</label><input value={form.version} onChange={e=>setForm(f=>({...f,version:e.target.value}))} placeholder="1.2.0" style={s.inp} /></div>
                <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={s.inp} /></div>
                <div><label style={lbl}>Type</label>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={s.inp}>
                    {TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:'12px' }}><label style={lbl}>Title</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="What changed in this release" style={s.inp} /></div>
              <div style={{ marginBottom:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                  <label style={lbl}>Changes</label>
                  <button onClick={addChange} style={s.sm}>+ Add</button>
                </div>
                {form.changes.map((ch, i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'100px 1fr 32px', gap:'6px', marginBottom:'6px' }}>
                    <select value={ch.type} onChange={e=>updChange(i,'type',e.target.value)} style={{...s.inp,padding:'6px 8px'}}>
                      {['new','fix','improved','removed'].map(t=><option key={t}>{t}</option>)}
                    </select>
                    <input value={ch.text} onChange={e=>updChange(i,'text',e.target.value)} placeholder="What changed..." style={s.inp} />
                    <button onClick={()=>delChange(i)} style={{...s.del,padding:'6px'}}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={save} style={s.btn}>💾 Save</button>
                <button onClick={()=>{setEditing(null);setForm(EMPTY);}} style={s.sm}>Cancel</button>
              </div>
            </div>
          )}

          {/* Entries list */}
          {entries.map((e, i) => (
            <div key={i} style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'16px 20px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'4px' }}>
                  <span style={{ background:'#6c63ff22', color:'#8b85ff', padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>v{e.version}</span>
                  <span style={{ color:'#6b7280', fontSize:'12px' }}>{e.date}</span>
                  <span style={{ color:'#9999bb', fontSize:'12px', textTransform:'capitalize' }}>{e.type}</span>
                </div>
                <div style={{ color:'#fff', fontSize:'14px', fontWeight:'600' }}>{e.title}</div>
                <div style={{ color:'#6b7280', fontSize:'12px', marginTop:'4px' }}>{(e.changes||[]).length} changes</div>
              </div>
              <div style={{ display:'flex', gap:'6px' }}>
                <button onClick={()=>startEdit(i)} style={s.sm}>Edit</button>
                <button onClick={()=>del(i)} style={s.del}>Delete</button>
              </div>
            </div>
          ))}
          {entries.length===0 && <p style={{ color:'#6b7280', textAlign:'center', padding:'40px' }}>No changelog entries. Click "+ New Entry" to add one.</p>}
        </div>
      </AdminLayout>
    </>
  );
}

export default withAdminPage(AdminChangelog);

export const getServerSideProps = async () => ({ props: {} });
