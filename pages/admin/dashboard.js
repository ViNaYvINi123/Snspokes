import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import Link from 'next/link';

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

function StatCard({ label, value, sub, icon, color='#6c63ff', delta }) {
  return (
    <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', padding:'20px 22px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:`linear-gradient(to right,transparent,${color}80,transparent)` }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
        <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:`${color}12`, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px' }}>{icon}</div>
        {delta !== undefined && (
          <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'20px', background:delta>=0?'rgba(74,222,128,.1)':'rgba(248,113,113,.1)', color:delta>=0?'#4ade80':'#f87171', fontFamily:"'JetBrains Mono',monospace", fontWeight:600, border:`1px solid ${delta>=0?'rgba(74,222,128,.2)':'rgba(248,113,113,.2)'}` }}>
            {delta>=0?'↑':'↓'}{Math.abs(delta)}%
          </span>
        )}
      </div>
      <div style={{ fontSize:'28px', fontWeight:800, color:'#f0f4ff', letterSpacing:'-1px', marginBottom:'4px', fontFamily:"'Bricolage Grotesque',sans-serif" }}>{value}</div>
      <div style={{ fontSize:'12.5px', color:'#4b5563', fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:'11px', color:'#2a2a3a', marginTop:'3px', fontFamily:"'JetBrains Mono',monospace" }}>{sub}</div>}
    </div>
  );
}

function SysRow({ label, ok, detail }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #0d0d18' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:ok?'#4ade80':'#f87171', boxShadow:ok?'0 0 8px #4ade8080':'0 0 8px #f8717180' }}/>
        <span style={{ fontSize:'13px', color:'#9ca3af', fontFamily:"'JetBrains Mono',monospace" }}>{label}</span>
      </div>
      <span style={{ fontSize:'11px', color:ok?'#4ade80':'#f87171', fontFamily:"'JetBrains Mono',monospace" }}>{detail}</span>
    </div>
  );
}

function AdminDashboard() {
  const [sys,     setSys]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(null);
  const [searches, setSearches] = useState([]);

  const h = { 'x-admin-token': getAdminToken() };

  const fetchAll = async () => {
    try {
      const [sysRes, statsRes] = await Promise.allSettled([
        fetch('/api/admin/system',      { headers: h }).then(r=>r.json()),
        fetch('/api/admin/stats',        { headers: h }).then(r=>r.json()),
      ]);
      if (sysRes.status   === 'fulfilled') setSys(sysRes.value);
      if (statsRes.status === 'fulfilled') setSearches(statsRes.value?.trending || []);
      setUpdated(new Date());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
  }, []);

  const m   = sys?.metrics     || {};
  const red = sys?.redis        || {};

  const quickLinks = [
    { href:'/admin/users',      icon:'👥', label:'Manage Users',      color:'#6c63ff' },
    { href:'/admin/spokes',     icon:'🔌', label:'Manage Spokes',     color:'#8b5cf6' },
    { href:'/admin/analytics',  icon:'📈', label:'Analytics',         color:'#0ea5e9' },
    { href:'/admin/flags',      icon:'🚩', label:'Feature Flags',     color:'#10b981' },
    { href:'/admin/properties', icon:'⚙️', label:'System Properties', color:'#f59e0b' },
    { href:'/admin/logs',       icon:'📋', label:'System Logs',       color:'#f87171' },
  ];

  return (
    <>
      <Head><title>Dashboard — snspokes Admin</title></Head>
      <AdminLayout title="Dashboard" breadcrumbs={['Dashboard']}>
        <div style={{ padding:'24px 28px', maxWidth:'1200px' }}>

          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'28px' }}>
            <div>
              <h1 style={{ fontSize:'20px', fontWeight:700, color:'#f0f4ff', margin:0, fontFamily:"'Bricolage Grotesque',sans-serif" }}>Control Panel</h1>
              <p style={{ color:'#2a2a3a', fontSize:'11px', marginTop:'3px', fontFamily:"'JetBrains Mono',monospace" }}>
                {updated ? `last_sync: ${updated.toLocaleTimeString()}` : 'loading...'}
              </p>
            </div>
            <button onClick={fetchAll} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'8px', color:'#6b7280', fontSize:'12px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}
              onMouseOver={e=>{e.currentTarget.style.borderColor='#6c63ff';e.currentTarget.style.color='#8b85ff';}}
              onMouseOut={e=>{e.currentTarget.style.borderColor='#1a1a2e';e.currentTarget.style.color='#6b7280';}}>
              ↻ refresh
            </button>
          </div>

          {/* Stats grid */}
          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'12px', marginBottom:'28px' }}>
              {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:'110px', borderRadius:'12px' }}/>)}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'12px', marginBottom:'28px' }}>
              <StatCard icon="👥" label="Total Users"   value={m.users?.toLocaleString()||'0'}         color="#6c63ff" />
              <StatCard icon="🔌" label="Active Spokes" value={m.spokes?.toLocaleString()||'0'}        color="#8b5cf6" />
              <StatCard icon="⌕"  label="Searches Today" value={m.searches_today?.toLocaleString()||'0'} color="#0ea5e9" sub="24h window" />
              <StatCard icon="💰" label="Revenue"       value={`$${((m.revenue||0)/100).toFixed(0)}`}   color="#10b981" sub="all time" />
            </div>
          )}

          {/* 2-col layout */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>

            {/* System health */}
            <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #0d0d18', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'13px', fontWeight:600, color:'#e2e8f0' }}>System Health</span>
                <Link href="/admin/system" style={{ fontSize:'11px', color:'#6c63ff', textDecoration:'none', fontFamily:"'JetBrains Mono',monospace" }}>view →</Link>
              </div>
              <div style={{ padding:'12px 18px' }}>
                {loading ? (
                  [1,2,3].map(i=><div key={i} className="skeleton" style={{ height:'14px', borderRadius:'4px', marginBottom:'10px' }}/>)
                ) : (
                  <>
                    <SysRow label="database"    ok={true}          detail={`${m.users||0} users`} />
                    <SysRow label="redis_cache" ok={red.connected !== false} detail={red.connected !== false ? 'connected' : 'fallback'} />
                    <SysRow label="ai_providers" ok={true}         detail="openrouter | gemini | ollama" />
                    <SysRow label="search_index" ok={true}         detail={`${m.spokes||0} spokes indexed`} />
                  </>
                )}
              </div>
            </div>

            {/* Top searches */}
            <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #0d0d18', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'13px', fontWeight:600, color:'#e2e8f0' }}>Top Searches</span>
                <Link href="/admin/analytics" style={{ fontSize:'11px', color:'#6c63ff', textDecoration:'none', fontFamily:"'JetBrains Mono',monospace" }}>view →</Link>
              </div>
              <div style={{ padding:'12px 18px' }}>
                {loading ? (
                  [1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:'14px', borderRadius:'4px', marginBottom:'8px' }}/>)
                ) : searches.length ? (
                  searches.slice(0,5).map((s,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'6px 0', borderBottom:'1px solid #0d0d18' }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', width:'16px', flexShrink:0 }}>{i+1}</span>
                      <span style={{ fontSize:'12.5px', color:'#9ca3af', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.query}</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4b5563' }}>{s.count}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color:'#2a2a3a', fontSize:'12px', fontFamily:"'JetBrains Mono',monospace", paddingTop:'8px' }}>no_data_yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #0d0d18' }}>
              <span style={{ fontSize:'13px', fontWeight:600, color:'#e2e8f0' }}>Quick Access</span>
            </div>
            <div style={{ padding:'16px 18px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'10px' }}>
              {quickLinks.map(l=>(
                <Link key={l.href} href={l.href} style={{ textDecoration:'none' }}>
                  <div style={{ padding:'14px 16px', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', borderRadius:'10px', cursor:'pointer', transition:'all .15s', display:'flex', alignItems:'center', gap:'10px' }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=l.color+'40';e.currentTarget.style.background=l.color+'0a';e.currentTarget.style.transform='translateY(-2px)';}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.04)';e.currentTarget.style.background='rgba(255,255,255,.02)';e.currentTarget.style.transform='translateY(0)';}}>
                    <span style={{ fontSize:'18px' }}>{l.icon}</span>
                    <span style={{ fontSize:'12.5px', color:'#9ca3af', fontWeight:500 }}>{l.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export default withAdminPage(AdminDashboard);
export const getServerSideProps = async () => ({ props: {} });
