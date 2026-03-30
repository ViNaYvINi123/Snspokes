import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AdminChatbotLogs() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const h = { 'x-admin-token': localStorage.getItem('admin_token')||'' };

  const load = (q='') => {
    setLoading(true);
    fetch(`/api/admin/chatbot-logs${q?`?search=${encodeURIComponent(q)}`:''}`, { headers: h })
      .then(r=>r.json()).then(d=>{ if(d.success) setData(d); }).finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <Head><title>Chatbot Logs — snspokes Admin</title></Head>
      <AdminLayout title="Chatbot Logs">
        <div style={{ padding:'24px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:'0 0 20px' }}>🤖 Chatbot Logs</h1>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px', marginBottom:'20px' }}>
            {[
              { label:'Total Chats (7d)', value: data?.stats?.total_chats        || 0, color:'#6c63ff' },
              { label:'Unique Users',     value: data?.stats?.unique_users       || 0, color:'#00D4AA' },
              { label:'Avg Duration',     value: data?.stats?.avg_duration ? `${Math.round(data.stats.avg_duration)}ms` : '—', color:'#FFB347' },
            ].map(s => (
              <div key={s.label} style={{ background:'#0f0f1a', border:`1px solid ${s.color}22`, borderRadius:'12px', padding:'16px' }}>
                <div style={{ fontSize:'22px', fontWeight:'800', color:s.color }}>{loading?'…':s.value}</div>
                <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top questions */}
          {(data?.top_questions||[]).length > 0 && (
            <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'16px', marginBottom:'20px' }}>
              <h3 style={{ color:'#fff', fontSize:'13px', fontWeight:'700', margin:'0 0 12px' }}>🔥 Top Questions</h3>
              {data.top_questions.map((q,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #1e1e2e22', fontSize:'13px' }}>
                  <span style={{ color:'#9999bb' }}>{q.question}</span>
                  <span style={{ color:'#6c63ff', fontWeight:'700' }}>{q.count}×</span>
                </div>
              ))}
            </div>
          )}

          {/* Search + logs */}
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(search)}
              placeholder="Search questions..." style={{ flex:1, background:'#111827', border:'1px solid #1e1e2e', borderRadius:'8px', padding:'8px 12px', color:'#e2e8f0', fontSize:'13px', outline:'none' }} />
            <button onClick={()=>load(search)} style={{ padding:'8px 16px', background:'#6c63ff', border:'none', borderRadius:'8px', color:'#fff', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>Search</button>
          </div>

          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#111827', borderBottom:'1px solid #1e1e2e' }}>
                {['User','Question','Time'].map(h=>(
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontSize:'11px', textTransform:'uppercase', fontWeight:'600' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(data?.logs||[]).map((l,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                    <td style={{ padding:'10px 16px', color:'#9999bb' }}>{l.user_email||'Anonymous'}</td>
                    <td style={{ padding:'10px 16px', color:'#e2e8f0', maxWidth:'500px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.question||'—'}</td>
                    <td style={{ padding:'10px 16px', color:'#6b7280', whiteSpace:'nowrap' }}>{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {!loading && (data?.logs||[]).length===0 && <tr><td colSpan={3} style={{ padding:'40px', textAlign:'center', color:'#6b7280' }}>No chatbot logs yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export default withAdminPage(AdminChatbotLogs);

export const getServerSideProps = async () => ({ props: {} });
