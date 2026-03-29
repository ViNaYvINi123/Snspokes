import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AdminChurn() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('at_risk');
  const headers = { 'x-admin-token': localStorage.getItem('admin_token') || '' };

  useEffect(() => {
    fetch('/api/admin/churn', { headers }).then(r => r.json()).then(d => { if (d.success) setData(d); }).finally(() => setLoading(false));
  }, []);

  // Simple bar chart
  const BarChart = ({ data: d, valueKey, labelKey, color = '#6c63ff', height = 120 }) => {
    if (!d?.length) return <p style={{ color:'#6b7280', fontSize:'13px' }}>No data</p>;
    const max = Math.max(...d.map(x => parseFloat(x[valueKey]) || 0), 1);
    return (
      <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height }}>
        {d.map((item, i) => {
          const pct = ((parseFloat(item[valueKey]) || 0) / max) * 100;
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', height:'100%', justifyContent:'flex-end' }}>
              <div style={{ fontSize:'9px', color:'#6b7280' }}>{item[valueKey]}</div>
              <div style={{ width:'100%', background:`${color}22`, borderRadius:'4px 4px 0 0', height:'80%', position:'relative' }}>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${pct}%`, background:color, borderRadius:'4px 4px 0 0', minHeight: pct > 0 ? '3px' : '0' }} />
              </div>
              <div style={{ fontSize:'9px', color:'#4b4b6a', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{item[labelKey]}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Head><title>Churn Analytics — snspokes Admin</title></Head>
      <AdminLayout title="Churn Analytics">
        <div style={{ padding:'24px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:'0 0 20px' }}>📉 Churn Analytics</h1>

          {/* Summary cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' }}>
            {[
              { label:'Churned (30d)', value:data?.churned_users?.length || 0, color:'#f87171' },
              { label:'At-Risk Users', value:data?.at_risk_users?.length || 0, color:'#FFB347' },
              { label:'Churn Reasons', value:data?.churn_reasons?.length || 0, color:'#6c63ff' },
              { label:'MRR Months', value:data?.mrr_growth?.length || 0, color:'#4ade80' },
            ].map(st => (
              <div key={st.label} style={{ background:'#0f0f1a', border:`1px solid ${st.color}22`, borderRadius:'12px', padding:'16px' }}>
                <div style={{ fontSize:'28px', fontWeight:'800', color:st.color }}>{loading ? '...' : st.value}</div>
                <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'4px' }}>{st.label}</div>
              </div>
            ))}
          </div>

          {/* MRR Growth Chart */}
          {data?.mrr_growth?.length > 0 && (
            <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'20px', marginBottom:'20px' }}>
              <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 16px' }}>📈 MRR Growth</h3>
              <BarChart data={data.mrr_growth.map(r => ({ label: new Date(r.month).toLocaleDateString('en', { month:'short' }), count: parseFloat(r.mrr || 0).toFixed(0) }))} valueKey="count" labelKey="label" color="#6c63ff" height={140} />
            </div>
          )}

          {/* Tabs */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'16px' }}>
            {['at_risk','churned','reasons'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding:'6px 14px', background:tab===t?'#f87171':'#1e1e2e', border:'none', borderRadius:'8px', color:tab===t?'#fff':'#9999bb', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{t.replace('_',' ')}</button>
            ))}
          </div>

          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            {tab === 'at_risk' && (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ borderBottom:'1px solid #1e1e2e', background:'#111827' }}>
                  {['User','Plan','Last Login','Days Inactive','Action'].map(h => <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(data?.at_risk_users || []).map((u, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                      <td style={{ padding:'10px 16px' }}><div style={{ color:'#e2e8f0', fontWeight:'600' }}>{u.name}</div><div style={{ color:'#6b7280', fontSize:'11px' }}>{u.email}</div></td>
                      <td style={{ padding:'10px 16px' }}><span style={{ background:'#6c63ff22', color:'#6c63ff', padding:'2px 8px', borderRadius:'20px', fontSize:'11px' }}>{u.plan}</span></td>
                      <td style={{ padding:'10px 16px', color:'#6b7280' }}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                      <td style={{ padding:'10px 16px', color: parseInt(u.days_inactive) > 30 ? '#f87171' : '#FFB347', fontWeight:'700' }}>{Math.round(u.days_inactive)} days</td>
                      <td style={{ padding:'10px 16px' }}><button style={{ padding:'3px 10px', background:'#6c63ff22', border:'1px solid #6c63ff44', borderRadius:'6px', color:'#6c63ff', fontSize:'11px', cursor:'pointer' }}>Re-engage →</button></td>
                    </tr>
                  ))}
                  {!loading && (data?.at_risk_users || []).length === 0 && <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#4ade80' }}>✅ No at-risk users!</td></tr>}
                </tbody>
              </table>
            )}
            {tab === 'churned' && (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ borderBottom:'1px solid #1e1e2e', background:'#111827' }}>
                  {['User','Days Subscribed','Cancelled','Action'].map(h => <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(data?.churned_users || []).map((u, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                      <td style={{ padding:'10px 16px' }}><div style={{ color:'#e2e8f0' }}>{u.name}</div><div style={{ color:'#6b7280', fontSize:'11px' }}>{u.email}</div></td>
                      <td style={{ padding:'10px 16px', color:'#e2e8f0' }}>{Math.round(u.days_subscribed || 0)} days</td>
                      <td style={{ padding:'10px 16px', color:'#6b7280' }}>{new Date(u.cancelled_at).toLocaleDateString()}</td>
                      <td style={{ padding:'10px 16px' }}><button style={{ padding:'3px 10px', background:'#4ade8022', border:'1px solid #4ade8044', borderRadius:'6px', color:'#4ade80', fontSize:'11px', cursor:'pointer' }}>Win back →</button></td>
                    </tr>
                  ))}
                  {!loading && (data?.churned_users || []).length === 0 && <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:'#4ade80' }}>✅ No churns this month!</td></tr>}
                </tbody>
              </table>
            )}
            {tab === 'reasons' && (
              <div style={{ padding:'20px' }}>
                {(data?.churn_reasons || []).map((r, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #1e1e2e22' }}>
                    <span style={{ color:'#e2e8f0', fontSize:'13px' }}>{r.reason || 'No reason given'}</span>
                    <span style={{ color:'#f87171', fontWeight:'700' }}>{r.count}×</span>
                  </div>
                ))}
                {(data?.churn_reasons || []).length === 0 && <p style={{ color:'#6b7280', fontSize:'13px' }}>No churn reasons recorded yet</p>}
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
export default withAdminPage(AdminChurn);
