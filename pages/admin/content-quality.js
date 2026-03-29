import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

function ContentQuality() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('missing');

  const fetch = async () => {
    try { const r = await axios.get('/api/admin/content-quality'); setData(r.data); }
    catch(err) { if (err.response?.status===401) window.location.href='/admin'; }
    finally { setLoading(false); }
  };

  useEffect(()=>{ fetch(); },[]);

  const verify = async (id) => {
    await axios.patch('/api/admin/content-quality', {id, quality_score: 100});
    fetch();
  };

  const ov = data?.overview || {};
  const total = parseInt(ov.total)||0;
  const complete = parseInt(ov.complete)||0;
  const pct = total > 0 ? Math.round((complete/total)*100) : 0;

  return (
    <>
      <Head><title>Content Quality — snspokes Admin</title></Head>
      <AdminLayout title="Content Quality Control" breadcrumbs={['Catalog','Content Quality']}>
        {loading ? <div style={{textAlign:'center',padding:'60px',color:'#9ca3af'}}>Loading...</div> : (
          <>
            {/* Overview */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'20px' }}>
              {[
                {label:'Total Spokes', v:total, color:'#6c63ff', icon:'🔌'},
                {label:'Complete', v:complete, color:'#16a34a', icon:'✅'},
                {label:'Need Content', v:parseInt(ov.no_content)||0, color:'#f59e0b', icon:'📝'},
                {label:'Completion', v:`${pct}%`, color: pct>=80?'#16a34a':pct>=50?'#f59e0b':'#dc2626', icon:'📊'},
              ].map(s => (
                <div key={s.label} style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'10px', padding:'16px' }}>
                  <div style={{ fontSize:'22px', fontWeight:'700', color:s.color, marginBottom:'2px' }}>{s.v}</div>
                  <div style={{ fontSize:'12px', color:'#6b7280' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'10px', padding:'16px', marginBottom:'20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'8px' }}>
                <span style={{ fontWeight:'600', color:'#9999bb' }}>Content Completeness</span>
                <span style={{ color: pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626', fontWeight:'700' }}>{pct}%</span>
              </div>
              <div style={{ height:'8px', background:'#111122', borderRadius:'4px' }}>
                <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,#6c63ff,#a855f7)`, borderRadius:'4px', transition:'width 0.5s' }} />
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:'0', borderBottom:'1px solid #e5e7eb', marginBottom:'16px' }}>
              {[['missing','📝 Missing Content'],['low_rated','👎 Low Rated'],['stale','🕐 Stale Content']].map(([t,l]) => (
                <button key={t} onClick={()=>setTab(t)} style={{ padding:'10px 18px', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#6c63ff':'transparent'}`, color:tab===t?'#6c63ff':'#6b7280', fontSize:'13px', fontWeight:tab===t?'600':'400', cursor:'pointer', fontFamily:'inherit', marginBottom:'-1px' }}>{l}</button>
              ))}
            </div>

            {/* Table */}
            <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:'#0d0d1a', borderBottom:'1px solid #e5e7eb' }}>
                  <th style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#6b7280', textTransform:'uppercase' }}>Spoke</th>
                  <th style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'#6b7280', textTransform:'uppercase' }}>Category</th>
                  <th style={{ padding:'10px 14px', textAlign:'center', fontSize:'11px', fontWeight:'700', color:'#6b7280', textTransform:'uppercase' }}>Views</th>
                  <th style={{ padding:'10px 14px', textAlign:'center', fontSize:'11px', fontWeight:'700', color:'#6b7280', textTransform:'uppercase' }}>Action</th>
                </tr></thead>
                <tbody>
                  {(data?.[tab==='missing'?'missing_content':tab==='low_rated'?'low_rated':'stale_content']||[]).map(spoke => (
                    <tr key={spoke.id} style={{ borderBottom:'1px solid #f9fafb' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ fontWeight:'600', color:'#e2e8f0' }}>{spoke.name}</div>
                        <code style={{ fontSize:'11px', color:'#9ca3af' }}>{spoke.slug}</code>
                      </td>
                      <td style={{ padding:'10px 14px' }}><span style={{ padding:'2px 8px', background:'#ede9fe', color:'#7c3aed', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{spoke.category}</span></td>
                      <td style={{ padding:'10px 14px', textAlign:'center', color:'#6b7280' }}>{spoke.view_count||0}</td>
                      <td style={{ padding:'10px 14px', textAlign:'center' }}>
                        <div style={{ display:'flex', gap:'6px', justifyContent:'center' }}>
                          <a href={`/admin/spokes?edit=${spoke.id}`} style={{ padding:'4px 10px', background:'#ede9fe', border:'1px solid #c4b5fd', borderRadius:'6px', fontSize:'11px', color:'#7c3aed', textDecoration:'none', fontWeight:'600' }}>Edit</a>
                          <button onClick={()=>verify(spoke.id)} style={{ padding:'4px 10px', background:'#052e16', border:'1px solid #bbf7d0', borderRadius:'6px', fontSize:'11px', color:'#16a34a', cursor:'pointer', fontFamily:'inherit', fontWeight:'600' }}>✓ Verify</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data?.[tab==='missing'?'missing_content':tab==='low_rated'?'low_rated':'stale_content']||[]).length === 0 && (
                <div style={{ padding:'40px', textAlign:'center', color:'#9ca3af', fontSize:'13px' }}>
                  {tab==='missing' ? '✅ All spokes have content!' : tab==='low_rated' ? '✅ No low-rated spokes' : '✅ All content is fresh!'}
                </div>
              )}
            </div>
          </>
        )}
      </AdminLayout>
    </>
  );
}

export default withAdminPage(ContentQuality);
