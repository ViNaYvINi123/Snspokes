import { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const SERVICES = [
  { name:'Web Application', key:'app' },
  { name:'Search API', key:'search' },
  { name:'AI Services', key:'ai' },
  { name:'Database', key:'db' },
  { name:'Authentication', key:'auth' },
  { name:'Payments', key:'payments' },
];

export default function StatusPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const checkHealth = async () => {
    try {
      const r = await fetch('/api/health');
      const d = await r.json();
      setHealth(d);
      setLastChecked(new Date());
    } catch { setHealth({ status:'down' }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // check every 30s
    return () => clearInterval(interval);
  }, []);

  const overallOk = health?.status === 'ok';
  const dbOk = health?.services?.db === 'available';
  const aiOk = health?.services?.ai?.includes('available');

  const serviceStatus = (key) => {
    if (loading) return 'checking';
    if (!health) return 'unknown';
    if (key === 'app' || key === 'auth' || key === 'search') return overallOk ? 'operational' : 'degraded';
    if (key === 'db') return dbOk ? 'operational' : 'outage';
    if (key === 'ai') return aiOk ? 'operational' : 'degraded';
    if (key === 'payments') return overallOk ? 'operational' : 'degraded';
    return 'operational';
  };

  const STATUS_CONFIG = {
    operational: { color:'#22c55e', label:'Operational', bg:'#052e16' },
    degraded:    { color:'#f59e0b', label:'Degraded', bg:'#1f1400' },
    outage:      { color:'#ef4444', label:'Outage', bg:'#2d0a0a' },
    checking:    { color:'#6b7280', label:'Checking...', bg:'#1e1e2e' },
    unknown:     { color:'#6b7280', label:'Unknown', bg:'#1e1e2e' },
  };

  const allOperational = SERVICES.every(s => serviceStatus(s.key) === 'operational');

  return (
    <>
      <Head>
        <title>Status — snspokes</title>
        <meta name="description" content="Real-time status of snspokes services." />
      </Head>
      <Navbar />
      <main style={{ paddingTop:'90px', minHeight:'100vh', background:'#0a0a0f' }}>
        <div style={{ maxWidth:'640px', margin:'0 auto', padding:'60px 24px' }}>

          {/* Overall status banner */}
          <div style={{ background: allOperational && !loading ? '#052e16' : '#1f1400', border:`1px solid ${allOperational && !loading ? '#16a34a' : '#d97706'}`, borderRadius:'16px', padding:'28px', marginBottom:'40px', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>
              {loading ? '⏳' : allOperational ? '✅' : '⚠️'}
            </div>
            <h1 style={{ fontSize:'24px', fontWeight:'800', color:'#fff', margin:'0 0 8px' }}>
              {loading ? 'Checking services...' : allOperational ? 'All Systems Operational' : 'Some Systems Degraded'}
            </h1>
            {lastChecked && <p style={{ color:'#6b7280', fontSize:'13px', margin:0 }}>Last checked: {lastChecked.toLocaleTimeString()}</p>}
          </div>

          {/* Service statuses */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'16px', overflow:'hidden', marginBottom:'32px' }}>
            {SERVICES.map((service, i) => {
              const status = serviceStatus(service.key);
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={service.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom: i < SERVICES.length - 1 ? '1px solid #1e1e2e' : 'none' }}>
                  <span style={{ color:'#e2e8f0', fontSize:'15px', fontWeight:'500' }}>{service.name}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', background:cfg.bg, padding:'4px 12px', borderRadius:'20px', border:`1px solid ${cfg.color}44` }}>
                    <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:cfg.color }} />
                    <span style={{ color:cfg.color, fontSize:'12px', fontWeight:'600' }}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Health details */}
          {health && (
            <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'20px', marginBottom:'24px' }}>
              <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 12px' }}>System Details</h3>
              {[
                ['Version', health.version],
                ['Uptime', `${Math.floor((health.uptime_seconds || 0) / 3600)}h ${Math.floor(((health.uptime_seconds || 0) % 3600) / 60)}m`],
                ['DB Latency', health.services?.db_latency_ms ? `${health.services.db_latency_ms}ms` : 'N/A'],
                ['Redis', health.services?.redis || 'N/A'],
              ].map(([l, v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #1e1e2e22', fontSize:'13px' }}>
                  <span style={{ color:'#6b7280' }}>{l}</span>
                  <span style={{ color:'#e2e8f0', fontWeight:'600' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <p style={{ color:'#4b4b6a', fontSize:'12px', textAlign:'center' }}>
            This page auto-refreshes every 30 seconds. For incidents, follow us or check our{' '}
            <a href="/changelog" style={{ color:'#6c63ff' }}>changelog</a>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
