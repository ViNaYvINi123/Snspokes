import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import { StatCardSkeleton } from '../../components/Skeleton';

function MetricCard({ icon, label, value, sub, color = '#6c63ff', trend }) {
  return (
    <div style={{ padding:'20px', background:'#0f0f1a', borderRadius:'14px', border:`1px solid ${color}22` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:`${color}18`, border:`1px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize:'12px', fontWeight:'600', color: trend >= 0 ? '#4ade80' : '#f87171' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize:'26px', fontWeight:'800', color:'#fff', letterSpacing:'-0.03em', marginBottom:'4px' }}>{value}</div>
      <div style={{ fontSize:'12px', color:'#6b6b8a' }}>{label}</div>
      {sub && <div style={{ fontSize:'11px', color:`${color}88`, marginTop:'3px' }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, valueKey = 'count', labelKey = 'label', color = '#6c63ff', height = 140 }) {
  if (!data?.length) return <div style={{ color:'#6b6b8a', fontSize:'13px', textAlign:'center', padding:'40px 0' }}>No data yet</div>;
  const max = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height, paddingTop:'8px' }}>
      {data.map((d, i) => {
        const pct = ((parseFloat(d[valueKey]) || 0) / max) * 100;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', height:'100%', justifyContent:'flex-end' }}>
            <div style={{ fontSize:'10px', color:'#6b6b8a', textAlign:'center' }}>
              {typeof d[valueKey] === 'number' && d[valueKey] > 999 ? `₹${(d[valueKey]/1000).toFixed(1)}k` : d[valueKey]}
            </div>
            <div style={{ width:'100%', background:`${color}22`, borderRadius:'6px 6px 0 0', position:'relative', overflow:'hidden', height:'80%' }}>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${pct}%`, background:`linear-gradient(180deg, ${color}, ${color}99)`, borderRadius:'6px 6px 0 0', transition:'height 0.6s ease', minHeight: pct > 0 ? '4px' : '0' }} />
            </div>
            <div style={{ fontSize:'9px', color:'#4b4b6a', textAlign:'center', lineHeight:1.2 }}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

function AdminRevenuePage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/revenue', { headers: { 'x-admin-token': getAdminToken() } })
      .then(r => r.json()).then(d => { if (d.success !== false) setData(d); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const mrr   = data?.mrr   || {};
  const trend = (data?.monthly_trend || []).slice(-6).map(r => ({
    label: new Date(r.month + '-01').toLocaleDateString('en', { month:'short' }),
    count: parseFloat(r.revenue || 0),
  }));

  const planColors = { free:'#6b7280', pro:'#6c63ff', enterprise:'#f59e0b' };
  const totalUsers = (data?.plan_distribution || []).reduce((s, p) => s + parseInt(p.count || 0), 0) || 1;

  return (
    <>
      <Head><title>Revenue — snspokes Admin</title></Head>
      <AdminLayout title="Revenue">
        <div style={{ padding:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
            <div>
              <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:0 }}>💰 Revenue Dashboard</h1>
              <p style={{ color:'#6b6b8a', fontSize:'12px', marginTop:'3px' }}>Real-time subscription and payment data</p>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <a href="/api/admin/export?type=payments&format=csv" style={{ padding:'7px 14px', background:'#1e1e2e', border:'1px solid #2a2a3e', borderRadius:'8px', color:'#9999bb', textDecoration:'none', fontSize:'12px' }}>📥 CSV</a>
              <a href="/api/admin/export?type=payments&format=json" style={{ padding:'7px 14px', background:'#1e1e2e', border:'1px solid #2a2a3e', borderRadius:'8px', color:'#9999bb', textDecoration:'none', fontSize:'12px' }}>📥 JSON</a>
            </div>
          </div>

          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' }}>
              {[...Array(4)].map((_,i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <>
              {/* Metric cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'20px' }}>
                <MetricCard icon="💰" label="Monthly Recurring Revenue" value={`₹${(mrr.amount || 0).toLocaleString()}`} color="#10b981" trend={12} />
                <MetricCard icon="👥" label="Paying Customers"         value={(mrr.pro_users||0)+(mrr.team_users||0)} sub={`${mrr.pro_users||0} Pro · ${mrr.team_users||0} Enterprise`} color="#6c63ff" trend={8} />
                <MetricCard icon="📈" label="Conversion Rate"          value={`${data?.conversion_rate || 0}%`} sub="Free → Paid (30 days)" color="#0ea5e9" trend={2} />
                <MetricCard icon="⚠️" label="Failed Payments"          value={data?.failed_payments || 0} sub="Last 30 days" color="#ef4444" />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
                {/* Revenue trend chart */}
                <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'14px', padding:'20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                    <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:0 }}>📈 Revenue Trend</h3>
                    <span style={{ fontSize:'11px', color:'#4ade80' }}>↑ 12% vs last month</span>
                  </div>
                  <BarChart data={trend} valueKey="count" labelKey="label" color="#6c63ff" />
                </div>

                {/* Plan distribution */}
                <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'14px', padding:'20px' }}>
                  <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 16px' }}>🥧 Plan Distribution</h3>
                  <div style={{ space:'12px' }}>
                    {(data?.plan_distribution || []).map(p => {
                      const pct = Math.round((parseInt(p.count||0) / totalUsers) * 100);
                      const c = planColors[p.plan] || '#6b7280';
                      return (
                        <div key={p.plan} style={{ marginBottom:'14px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                            <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'600', textTransform:'capitalize' }}>{p.plan}</span>
                            <span style={{ color:c, fontSize:'12px', fontWeight:'600' }}>{p.count} users ({pct}%)</span>
                          </div>
                          <div style={{ height:'8px', background:'#1e1e2e', borderRadius:'4px', overflow:'hidden' }}>
                            <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg, ${c}, ${c}99)`, borderRadius:'4px', transition:'width 0.6s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                    {!data?.plan_distribution?.length && <p style={{ color:'#6b6b8a', fontSize:'13px' }}>No data yet</p>}
                  </div>

                  {/* MRR breakdown */}
                  <div style={{ borderTop:'1px solid #1e1e2e', marginTop:'16px', paddingTop:'16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                    <div style={{ background:'#6c63ff11', borderRadius:'8px', padding:'12px', border:'1px solid #6c63ff22' }}>
                      <div style={{ fontSize:'11px', color:'#6b6b8a', marginBottom:'4px' }}>Pro MRR</div>
                      <div style={{ fontSize:'18px', fontWeight:'800', color:'#6c63ff' }}>₹{((mrr.pro_users||0)*999).toLocaleString()}</div>
                    </div>
                    <div style={{ background:'#f59e0b11', borderRadius:'8px', padding:'12px', border:'1px solid #f59e0b22' }}>
                      <div style={{ fontSize:'11px', color:'#6b6b8a', marginBottom:'4px' }}>Enterprise MRR</div>
                      <div style={{ fontSize:'18px', fontWeight:'800', color:'#f59e0b' }}>₹{((mrr.team_users||0)*4999).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent payments table */}
              <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'14px', overflow:'hidden' }}>
                <div style={{ padding:'16px 20px', borderBottom:'1px solid #1e1e2e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:0 }}>Recent Transactions</h3>
                </div>
                {(data?.recent_payments || []).length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px', color:'#6b6b8a' }}>
                    <div style={{ fontSize:'32px', marginBottom:'8px' }}>💳</div>
                    <p style={{ margin:0, fontSize:'14px' }}>No transactions yet</p>
                    <p style={{ margin:'4px 0 0', fontSize:'12px' }}>Payments will appear here once users subscribe</p>
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid #1e1e2e' }}>
                        {['User','Plan','Amount','Status','Date'].map(h => (
                          <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b6b8a', fontWeight:'600', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.recent_payments || []).map((p, i) => (
                        <tr key={i} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                          <td style={{ padding:'12px 16px', color:'#e2e8f0' }}>{p.user_email || '—'}</td>
                          <td style={{ padding:'12px 16px' }}>
                            <span style={{ background: (planColors[p.plan]||'#6b7280')+'22', color: planColors[p.plan]||'#6b7280', padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', textTransform:'capitalize' }}>{p.plan}</span>
                          </td>
                          <td style={{ padding:'12px 16px', color:'#4ade80', fontWeight:'600' }}>₹{parseFloat(p.amount||0).toLocaleString()}</td>
                          <td style={{ padding:'12px 16px' }}>
                            <span style={{ color: p.status==='active'?'#4ade80':'#f87171', fontSize:'12px' }}>● {p.status}</span>
                          </td>
                          <td style={{ padding:'12px 16px', color:'#6b6b8a' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </>
  );
}


export default withAdminPage(AdminRevenuePage);

export const getServerSideProps = async () => ({ props: {} });
