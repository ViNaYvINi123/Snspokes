import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AdminReferrals() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const h = { 'x-admin-token': localStorage.getItem('admin_token')||'' };

  useEffect(() => {
    fetch('/api/admin/referrals', { headers: h }).then(r=>r.json()).then(d=>{ if(d.success) setData(d); }).finally(()=>setLoading(false));
  }, []);

  return (
    <>
      <Head><title>Referrals — snspokes Admin</title></Head>
      <AdminLayout title="Referral Management">
        <div style={{ padding:'24px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:'0 0 20px' }}>🎁 Referrals</h1>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'12px', marginBottom:'24px' }}>
            {[
              { label:'Total Referrers',    value: data?.stats?.total_referrers    || 0, color:'#6c63ff' },
              { label:'Total Referred',     value: data?.stats?.total_referred     || 0, color:'#00D4AA' },
              { label:'Converted',          value: data?.stats?.total_converted    || 0, color:'#4ade80' },
              { label:'Free Months Earned', value: data?.stats?.total_months       || 0, color:'#FFB347' },
            ].map(s => (
              <div key={s.label} style={{ background:'#0f0f1a', border:`1px solid ${s.color}22`, borderRadius:'12px', padding:'16px' }}>
                <div style={{ fontSize:'26px', fontWeight:'800', color:s.color }}>{loading?'…':s.value}</div>
                <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top referrers */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #1e1e2e' }}>
              <h3 style={{ color:'#fff', fontSize:'13px', fontWeight:'700', margin:0 }}>Top Referrers</h3>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#111827', borderBottom:'1px solid #1e1e2e' }}>
                {['User','Code','Referred','Converted','Months Earned'].map(h=>(
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontSize:'11px', textTransform:'uppercase', fontWeight:'600' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(data?.referrers||[]).map((r,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                    <td style={{ padding:'10px 16px' }}><div style={{ color:'#e2e8f0', fontWeight:'600' }}>{r.name}</div><div style={{ color:'#6b7280', fontSize:'11px' }}>{r.email}</div></td>
                    <td style={{ padding:'10px 16px' }}><code style={{ background:'#1e1e2e', padding:'2px 8px', borderRadius:'4px', color:'#6c63ff', fontSize:'12px' }}>{r.code}</code></td>
                    <td style={{ padding:'10px 16px', color:'#e2e8f0' }}>{r.total_referred}</td>
                    <td style={{ padding:'10px 16px', color:'#4ade80', fontWeight:'700' }}>{r.total_converted}</td>
                    <td style={{ padding:'10px 16px', color:'#FFB347' }}>{r.months_earned}</td>
                  </tr>
                ))}
                {!loading && (data?.referrers||[]).length===0 && (
                  <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#6b7280' }}>No referrals yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export default withAdminPage(AdminReferrals);

export const getServerSideProps = async () => ({ props: {} });
