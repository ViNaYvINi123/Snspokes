import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function UserDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [tab, setTab] = useState('timeline');
  const [msg, setMsg] = useState(null);

  useEffect(() => { if (id) fetch(`/api/admin/user-detail?id=${id}`, { headers: { 'x-admin-token': getAdminToken() } }).then(r => r.json()).then(d => { if (d.success) setData(d); }).catch(()=>{}).finally(() => setLoading(false)); }, [id]);

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const addNote = async () => {
    if (!note.trim()) return;
    const r = await fetch('/api/admin/user-detail', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() }, body: JSON.stringify({ action: 'add_note', user_id: id, note }) });
    const d = await r.json();
    if (d.success) { showMsg('Note added'); setNote(''); setData(prev => ({ ...prev, admin_notes: [{ note, created_by: 'admin', created_at: new Date() }, ...prev.admin_notes] })); }
  };

  const impersonate = async () => {
    if (!confirm('Impersonate this user? A token will be generated valid for 1 hour.')) return;
    const r = await fetch('/api/admin/user-detail', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() }, body: JSON.stringify({ action: 'impersonate', user_id: id }) });
    const d = await r.json();
    if (d.success) { showMsg(`Impersonation token generated. Copy: ${d.token.substring(0,20)}...`); }
  };

  const s = { card: { background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'20px' }, label: { fontSize:'11px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'4px' }, value: { fontSize:'14px', color:'#e2e8f0', fontWeight:'600' } };

  const TABS = ['timeline','notes','queries','api_keys','login_history'];

  if (loading) return <AdminLayout title="User Detail"><div style={{ padding:'40px', color:'#6b7280', textAlign:'center' }}>Loading...</div></AdminLayout>;
  if (!data) return <AdminLayout title="User Detail"><div style={{ padding:'40px', color:'#f87171', textAlign:'center' }}>User not found</div></AdminLayout>;

  const u = data.user;
  const planColor = { free:'#6b7280', pro:'#6c63ff', enterprise:'#f59e0b' }[u.plan] || '#6b7280';

  return (
    <>
      <Head><title>{u.name} — Admin snspokes</title></Head>
      <AdminLayout title="User Detail">
        <div style={{ padding:'24px' }}>
          {msg && <div style={{ position:'fixed', top:'80px', right:'24px', padding:'12px 20px', background: msg.type==='success'?'#052e16':'#2d0a0a', border:`1px solid ${msg.type==='success'?'#16a34a':'#dc2626'}`, borderRadius:'10px', color: msg.type==='success'?'#4ade80':'#f87171', fontSize:'13px', zIndex:999 }}>{msg.text}</div>}

          {/* Header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'linear-gradient(135deg,#6c63ff,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'800', color:'#fff' }}>{u.name?.[0]?.toUpperCase()}</div>
              <div>
                <h1 style={{ fontSize:'22px', fontWeight:'800', color:'#fff', margin:0 }}>{u.name}</h1>
                <p style={{ color:'#6b7280', fontSize:'13px', margin:'2px 0 0' }}>{u.email}</p>
                <span style={{ background:`${planColor}22`, color:planColor, padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase' }}>{u.plan}</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={impersonate} style={{ padding:'8px 16px', background:'#FFB34722', border:'1px solid #FFB34744', borderRadius:'8px', color:'#FFB347', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>👤 Impersonate</button>
              <button onClick={() => router.push(`/admin/users`)} style={{ padding:'8px 16px', background:'#1e1e2e', border:'1px solid #2a2a3e', borderRadius:'8px', color:'#9999bb', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' }}>
            {[
              { label:'Total Searches', value:data.stats.total_searches, color:'#6c63ff' },
              { label:'Code Generations', value:data.stats.total_code_gens, color:'#00D4AA' },
              { label:'Bookmarks', value:data.stats.total_bookmarks, color:'#FFB347' },
              { label:'Payments', value:data.stats.total_payments, color:'#4ade80' },
            ].map(st => (
              <div key={st.label} style={{ ...s.card, border:`1px solid ${st.color}22` }}>
                <div style={{ fontSize:'24px', fontWeight:'800', color:st.color }}>{st.value}</div>
                <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'4px' }}>{st.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'20px' }}>
            {/* Left: User info + notes */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div style={s.card}>
                <h3 style={{ color:'#fff', fontSize:'13px', fontWeight:'700', margin:'0 0 16px' }}>👤 User Info</h3>
                {[['ID', u.id], ['Plan', u.plan], ['Joined', new Date(u.created_at).toLocaleDateString()], ['Last Login', u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'], ['Onboarded', u.onboarded ? '✅' : '❌'], ['Role', u.role || '—'], ['SN Version', u.sn_version || '—'], ['Status', u.is_banned ? '🚫 Banned' : '✅ Active']].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #1e1e2e22', fontSize:'12px' }}>
                    <span style={{ color:'#6b7280' }}>{l}</span>
                    <span style={{ color:'#e2e8f0', fontWeight:'600' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Admin Notes */}
              <div style={s.card}>
                <h3 style={{ color:'#fff', fontSize:'13px', fontWeight:'700', margin:'0 0 12px' }}>📝 Admin Notes</h3>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add internal note..." style={{ width:'100%', background:'#111827', border:'1px solid #1e1e2e', borderRadius:'8px', padding:'8px', color:'#e2e8f0', fontSize:'12px', fontFamily:'inherit', resize:'vertical', minHeight:'70px', boxSizing:'border-box', outline:'none' }} />
                <button onClick={addNote} style={{ marginTop:'8px', padding:'6px 16px', background:'#6c63ff', border:'none', borderRadius:'8px', color:'#fff', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>Add Note</button>
                <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
                  {data.admin_notes.map((n, i) => (
                    <div key={i} style={{ background:'#111827', borderRadius:'8px', padding:'10px 12px', fontSize:'12px' }}>
                      <p style={{ color:'#e2e8f0', margin:'0 0 4px' }}>{n.note}</p>
                      <span style={{ color:'#4b4b6a' }}>{n.created_by} · {new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                  {data.admin_notes.length === 0 && <p style={{ color:'#4b4b6a', fontSize:'12px' }}>No notes yet</p>}
                </div>
              </div>
            </div>

            {/* Right: Tabs */}
            <div style={s.card}>
              <div style={{ display:'flex', gap:'4px', marginBottom:'20px', borderBottom:'1px solid #1e1e2e', paddingBottom:'12px' }}>
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding:'5px 12px', background:tab===t?'#6c63ff':'transparent', border:'none', borderRadius:'8px', color:tab===t?'#fff':'#6b7280', fontSize:'11px', cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{t.replace('_',' ')}</button>
                ))}
              </div>

              {tab === 'timeline' && (
                <div style={{ maxHeight:'500px', overflowY:'auto' }}>
                  {data.timeline.length === 0 && <p style={{ color:'#6b7280', fontSize:'13px' }}>No activity yet</p>}
                  {data.timeline.map((ev, i) => (
                    <div key={i} style={{ display:'flex', gap:'12px', padding:'10px 0', borderBottom:'1px solid #1e1e2e22' }}>
                      <span style={{ fontSize:'18px', width:'24px', textAlign:'center', flexShrink:0 }}>{ev.icon}</span>
                      <div style={{ flex:1 }}>
                        <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'500' }}>{ev.label}</span>
                        {ev.meta && <span style={{ color:'#6b7280', fontSize:'11px', marginLeft:'8px' }}>{ev.meta}</span>}
                      </div>
                      <span style={{ color:'#4b4b6a', fontSize:'11px', whiteSpace:'nowrap' }}>{new Date(ev.time).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'notes' && <p style={{ color:'#6b7280', fontSize:'13px' }}>Use the notes panel on the left →</p>}

              {tab === 'queries' && (
                <div>
                  {data.saved_queries.map((q, i) => (
                    <div key={i} style={{ padding:'10px 0', borderBottom:'1px solid #1e1e2e22' }}>
                      <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'600' }}>{q.name}</div>
                      <code style={{ color:'#6c63ff', fontSize:'11px' }}>{q.query}</code>
                      <span style={{ color:'#6b7280', fontSize:'11px', marginLeft:'8px' }}>{q.table_name}</span>
                    </div>
                  ))}
                  {data.saved_queries.length === 0 && <p style={{ color:'#6b7280', fontSize:'13px' }}>No saved queries</p>}
                </div>
              )}

              {tab === 'api_keys' && (
                <div>
                  {data.api_keys.map((k, i) => (
                    <div key={i} style={{ padding:'10px 0', borderBottom:'1px solid #1e1e2e22', display:'flex', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ color:'#e2e8f0', fontSize:'13px' }}>{k.name}</div>
                        <div style={{ color:'#6b7280', fontSize:'11px' }}>Last used: {k.last_used ? new Date(k.last_used).toLocaleDateString() : 'Never'}</div>
                      </div>
                    </div>
                  ))}
                  {data.api_keys.length === 0 && <p style={{ color:'#6b7280', fontSize:'13px' }}>No API keys</p>}
                </div>
              )}

              {tab === 'login_history' && (
                <div>
                  {data.login_history.map((l, i) => (
                    <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid #1e1e2e22', display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                      <span style={{ color:'#e2e8f0' }}>{l.ip_address}</span>
                      <span style={{ color:l.success?'#4ade80':'#f87171' }}>{l.success?'✅ Success':'❌ Failed'}</span>
                      <span style={{ color:'#6b7280' }}>{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                  {data.login_history.length === 0 && <p style={{ color:'#6b7280', fontSize:'13px' }}>No login history</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}


export default withAdminPage(UserDetailPage);

export const getServerSideProps = async () => ({ props: {} });
