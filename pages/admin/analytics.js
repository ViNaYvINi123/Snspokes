import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import { StatCardSkeleton } from '../../components/Skeleton';

function BarChart({ data, valueKey='count', labelKey='label', color='#6c63ff', height=120 }) {
  if (!data?.length) return <p style={{ color:'#6b6b8a', fontSize:'13px', textAlign:'center', padding:'30px 0' }}>No data yet</p>;
  const max = Math.max(...data.map(d => parseFloat(d[valueKey])||0), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height }}>
      {data.map((d, i) => {
        const pct = ((parseFloat(d[valueKey])||0)/max)*100;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', height:'100%', justifyContent:'flex-end' }}>
            <div style={{ fontSize:'9px', color:'#6b6b8a', textAlign:'center' }}>{d[valueKey]}</div>
            <div style={{ width:'100%', background:`${color}18`, borderRadius:'4px 4px 0 0', height:'80%', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${pct}%`, background:`linear-gradient(180deg,${color},${color}99)`, borderRadius:'4px 4px 0 0', minHeight:pct>0?'3px':'0', transition:'height 0.5s ease' }} />
            </div>
            <div style={{ fontSize:'9px', color:'#4b4b6a', textAlign:'center', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

function AdminAnalyticsPage() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState('7d');

  useEffect(() => {
    fetch(`/api/admin/stats?period=${period}`, { headers: { 'x-admin-token': localStorage.getItem('admin_token')||'' } })
      .then(r => r.json()).then(d => { if (d.success !== false) setStats(d.stats); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  const maxSearches = Math.max(...(stats?.top_searches?.map(s => parseInt(s.count)||0)||[1]));

  return (
    <>
      <Head><title>Analytics — snspokes Admin</title></Head>
      <AdminLayout title="Analytics">
        <div style={{ padding:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
            <div>
              <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:0 }}>📊 Search Analytics</h1>
              <p style={{ color:'#6b6b8a', fontSize:'12px', marginTop:'3px' }}>What developers are searching for</p>
            </div>
            <div style={{ display:'flex', gap:'6px' }}>
              {['24h','7d','30d','90d'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  style={{ padding:'5px 12px', background:period===p?'#6c63ff':'#1e1e2e', border:`1px solid ${period===p?'#6c63ff':'#2a2a3e'}`, borderRadius:'8px', color:period===p?'#fff':'#9999bb', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px' }}>
              {[...Array(3)].map((_,i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'20px' }}>
                {[
                  { icon:'🔍', label:'Total Searches',   value:(stats?.searches?.total||0).toLocaleString(),    color:'#6c63ff' },
                  { icon:'📅', label:"Today's Searches", value:stats?.searches?.today||0,                       color:'#4ade80' },
                  { icon:'💻', label:'Code Generations', value:stats?.code_generations?.total||0,               color:'#f59e0b' },
                  { icon:'👥', label:'Unique Users',      value:stats?.searches?.unique_users||0,               color:'#0ea5e9' },
                ].map(s => (
                  <div key={s.label} style={{ padding:'20px', background:'#0f0f1a', borderRadius:'14px', border:`1px solid ${s.color}22` }}>
                    <div style={{ fontSize:'22px', marginBottom:'8px' }}>{s.icon}</div>
                    <div style={{ fontSize:'26px', fontWeight:'800', color:s.color, marginBottom:'4px' }}>{s.value}</div>
                    <div style={{ fontSize:'12px', color:'#6b6b8a' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
                {/* Top searches */}
                <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'14px', padding:'20px' }}>
                  <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 16px' }}>🏆 Top Search Queries</h3>
                  {(stats?.top_searches||[]).length === 0
                    ? <p style={{ color:'#6b6b8a', fontSize:'13px' }}>No searches yet</p>
                    : (stats?.top_searches||[]).map((s, i) => {
                      const pct = Math.round((parseInt(s.count||0)/maxSearches)*100);
                      return (
                        <div key={i} style={{ marginBottom:'14px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <span style={{ fontSize:'11px', color:'#4b4b6a', width:'16px', textAlign:'right' }}>#{i+1}</span>
                              <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'500' }}>{s.query}</span>
                            </div>
                            <span style={{ color:'#6c63ff', fontSize:'12px', fontWeight:'700' }}>{s.count}×</span>
                          </div>
                          <div style={{ height:'5px', background:'#1e1e2e', borderRadius:'3px', overflow:'hidden' }}>
                            <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,#6c63ff,#a855f7)', borderRadius:'3px', transition:'width 0.5s' }} />
                          </div>
                        </div>
                      );
                    })
                  }
                </div>

                {/* Searches over time */}
                <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'14px', padding:'20px' }}>
                  <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 16px' }}>📈 Search Volume</h3>
                  <BarChart
                    data={(stats?.daily_searches||[]).map(d => ({ label: new Date(d.date).toLocaleDateString('en',{weekday:'short'}), count: d.count }))}
                    color="#6c63ff" height={140}
                  />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                {/* Zero result searches */}
                <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'14px', padding:'20px' }}>
                  <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 4px' }}>🚫 Zero Result Searches</h3>
                  <p style={{ color:'#6b6b8a', fontSize:'11px', margin:'0 0 16px' }}>Spokes developers want but don't exist yet</p>
                  {(stats?.zero_result_searches||[]).length === 0
                    ? <p style={{ color:'#6b6b8a', fontSize:'13px' }}>None yet — great coverage!</p>
                    : (stats?.zero_result_searches||[]).map((s, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #1e1e2e22' }}>
                        <span style={{ color:'#f87171', fontSize:'13px' }}>"{s.query}"</span>
                        <span style={{ color:'#6b6b8a', fontSize:'12px' }}>{s.count}×</span>
                      </div>
                    ))
                  }
                </div>

                {/* Recent searches */}
                <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'14px', padding:'20px' }}>
                  <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 16px' }}>🕐 Recent Searches</h3>
                  {(stats?.recent_searches||[]).length === 0
                    ? <p style={{ color:'#6b6b8a', fontSize:'13px' }}>No recent searches</p>
                    : (stats?.recent_searches||[]).map((s, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom: i < (stats.recent_searches.length-1) ? '1px solid #1e1e2e22' : 'none' }}>
                        <div>
                          <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'500' }}>{s.query}</span>
                          <div style={{ marginTop:'2px' }}>
                            <span style={{ fontSize:'11px', color: parseInt(s.results)>0?'#4ade80':'#f87171' }}>{s.results} results</span>
                          </div>
                        </div>
                        <span style={{ fontSize:'11px', color:'#4b4b6a', whiteSpace:'nowrap' }}>{new Date(s.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

export default withAdminPage(AdminAnalyticsPage);
