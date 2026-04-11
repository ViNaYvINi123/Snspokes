import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}
const h = () => ({ 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() });

const TIERS = [
  {
    n: '01',
    name: 'Static Seed',
    tag: 'ALWAYS WORKS',
    tagColor: '#4ade80',
    icon: '📦',
    desc: 'Reads 50 spokes + 76 system properties from local data files and upserts them into your database. Runs in seconds. No external dependencies.',
    trigger: 'Manual (run once on deploy, or anytime to re-sync)',
    actions: ['spokes','properties'],
  },
  {
    n: '02',
    name: 'Community RSS',
    tag: 'WORKS ON SERVER',
    tagColor: '#f59e0b',
    icon: '📡',
    desc: 'Fetches ServiceNow community blog RSS for "spoke" release posts. Works from your Hetzner server. Runs daily via cron and stores latest release notes.',
    trigger: 'Automatic (cron job: daily at 3am)',
    actions: ['release_notes'],
  },
  {
    n: '03',
    name: 'AI Enrichment',
    tag: 'AUTOMATIC',
    tagColor: '#8b85ff',
    icon: '⟡',
    desc: 'Uses OpenRouter to generate rich ai_description, personal_tip, and code_example for any spoke with empty fields. Processes 3-5 spokes per cron run.',
    trigger: 'Automatic (runs inside cron, ~3 spokes/day)',
    actions: ['enrich'],
  },
];

export default function SyncPage() {
  const [running,  setRunning]  = useState(false);
  const [action,   setAction]   = useState('full');
  const [logs,     setLogs]     = useState([]);
  const [result,   setResult]   = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [lastCron, setLastCron] = useState(null);
  const [stats,    setStats]    = useState(null);

  const addLog = (msg, type='info') => {
    const t = new Date().toLocaleTimeString('en-US', { hour12:false });
    setLogs(p => [...p.slice(-80), { t, msg, type, id: Date.now()+Math.random() }]);
  };

  const loadStatus = async () => {
    try {
      // Load sync metadata
      const r = await fetch('/api/admin/properties?search=snspokes.last', { headers: h() });
      const d = await r.json();
      const props = d.properties || [];
      const ls = props.find(p => p.name === 'snspokes.last_sync');
      const lc = props.find(p => p.name === 'snspokes.last_cron_sync');
      if (ls?.value) try { setLastSync(JSON.parse(ls.value)); } catch {}
      if (lc?.value) try { setLastCron(JSON.parse(lc.value)); } catch {}

      // Load DB counts
      const sr = await fetch('/api/admin/spokes?limit=1', { headers: h() });
      const sd = await sr.json();
      const pr = await fetch('/api/admin/properties?limit=1', { headers: h() });
      const pd = await pr.json();
      setStats({
        spokes: sd.total || 0,
        properties: pd.total || 0,
        enriched: sd.enriched || 0,
      });
    } catch {}
  };

  useEffect(() => { loadStatus(); }, []);

  const runSync = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setLogs([]);

    const labels = {
      full: ['Loading 50 spokes from data file...', 'Loading 76 system properties...', 'Fetching ServiceNow community RSS...', 'Running AI enrichment on empty spokes...'],
      spokes: ['Loading 50 spokes from data file...'],
      properties: ['Loading 76 system properties...'],
      release_notes: ['Fetching ServiceNow community RSS...'],
      enrich: ['Running AI enrichment on empty spokes...'],
    };
    addLog('▶ Starting sync — action: ' + action, 'info');
    (labels[action] || []).forEach(l => addLog(l, 'info'));

    try {
      const r = await fetch('/api/admin/sync', { method:'POST', headers:h(), body: JSON.stringify({ action }) });
      const d = await r.json();
      if (d.success) {
        setResult({ ok:true, ...d });
        if (d.spokes?.total)      addLog(`✓ Spokes: ${d.spokes.inserted||0} new, ${d.spokes.updated||0} updated, ${d.spokes.skipped||0} skipped`, 'success');
        if (d.properties?.total)  addLog(`✓ Properties: ${d.properties.total} processed`, 'success');
        if (d.release_notes?.length > 0) addLog(`✓ Release notes: ${d.release_notes.length} spoke posts found`, 'success');
        else if (['full','release_notes'].includes(action)) addLog('○ Release notes: RSS not reachable from this environment (normal in dev)', 'warn');
        if (d.enriched?.length)   addLog(`✓ AI enriched: ${d.enriched.join(', ')}`, 'success');
        if (d.errors?.length)     d.errors.forEach(e => addLog('⚠ ' + e, 'error'));
        addLog(`✓ Completed in ${d.duration_ms}ms`, 'success');
        loadStatus();
      } else {
        setResult({ ok:false, error: d.error });
        addLog('✗ Failed: ' + d.error, 'error');
      }
    } catch(err) {
      setResult({ ok:false, error: err.message });
      addLog('✗ ' + err.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  const logColor = { info:'#6b7280', success:'#4ade80', error:'#f87171', warn:'#f59e0b' };

  return (
    <>
      <Head><title>Sync Engine — snspokes Admin</title></Head>
      <AdminLayout title="Sync Engine" breadcrumbs={['System','Sync']}>
        <div style={{ padding:'24px 28px', maxWidth:'960px' }}>

          <div style={{ marginBottom:'24px' }}>
            <h1 style={{ fontSize:'20px', fontWeight:700, color:'#f0f4ff', margin:'0 0 4px', fontFamily:"'Bricolage Grotesque',sans-serif" }}>
              ServiceNow Sync Engine
            </h1>
            <p style={{ color:'#374151', fontSize:'12px', fontFamily:"'JetBrains Mono',monospace" }}>
              Three-tier strategy — static seed → community RSS → AI enrichment
            </p>
          </div>

          {/* DB stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
            {[
              { l:'Spokes in DB',     v: stats?.spokes      ?? '—', color:'#6c63ff' },
              { l:'System Properties',v: stats?.properties  ?? '—', color:'#8b5cf6' },
              { l:'Last Sync',        v: lastSync?.completed_at ? new Date(lastSync.completed_at).toLocaleDateString() : 'Never', color:'#0ea5e9' },
            ].map(s=>(
              <div key={s.l} style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'10px', padding:'14px 16px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:`linear-gradient(to right,transparent,${s.color}60,transparent)` }}/>
                <div style={{ fontSize:'22px', fontWeight:800, color:'#f0f4ff', fontFamily:"'Bricolage Grotesque',sans-serif" }}>{s.v}</div>
                <div style={{ fontSize:'11px', color:'#374151', marginTop:'2px', fontFamily:"'JetBrains Mono',monospace" }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Tier cards */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'24px' }}>
            {TIERS.map(tier=>(
              <div key={tier.n} style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', padding:'16px', position:'relative', overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#2a2a3a' }}>{tier.n}</span>
                    <span style={{ fontSize:'16px' }}>{tier.icon}</span>
                    <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600 }}>{tier.name}</span>
                  </div>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'8px', color:tier.tagColor, background:tier.tagColor+'15', padding:'2px 6px', borderRadius:'4px', border:`1px solid ${tier.tagColor}30`, whiteSpace:'nowrap' }}>{tier.tag}</span>
                </div>
                <p style={{ color:'#4b5563', fontSize:'11.5px', lineHeight:1.55, marginBottom:'10px' }}>{tier.desc}</p>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#2a2a3a', borderTop:'1px solid #0d0d18', paddingTop:'8px' }}>
                  {tier.trigger}
                </div>
              </div>
            ))}
          </div>

          {/* Cron setup instructions */}
          <div style={{ background:'#020208', border:'1px solid #0d0d18', borderRadius:'12px', padding:'16px 20px', marginBottom:'24px' }}>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'1px' }}>CRON SETUP (run on server once)</p>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px', color:'#4ade80', lineHeight:2 }}>
              <div><span style={{ color:'#2a2a3a' }}># 1. Add to .env.local on server</span></div>
              <div>CRON_SECRET=<span style={{ color:'#f59e0b' }}>your_random_secret</span></div>
              <div style={{ marginTop:'8px' }}><span style={{ color:'#2a2a3a' }}># 2. Add crontab entry (daily at 3am)</span></div>
              <div>0 3 * * * curl -s <span style={{ color:'#8b85ff' }}>"https://snspokes.com/api/cron/sync-spokes?secret=your_random_secret"</span></div>
              <div style={{ marginTop:'8px' }}><span style={{ color:'#2a2a3a' }}># 3. Test it now</span></div>
              <div>curl -s <span style={{ color:'#8b85ff' }}>"https://snspokes.com/api/cron/sync-spokes?secret=your_random_secret"</span></div>
            </div>
            {lastCron && (
              <div style={{ marginTop:'12px', padding:'8px 12px', background:'rgba(74,222,128,.06)', border:'1px solid rgba(74,222,128,.1)', borderRadius:'7px', fontFamily:"'JetBrains Mono',monospace", fontSize:'10.5px', color:'#4ade80' }}>
                Last cron: {lastCron.ran_at ? new Date(lastCron.ran_at).toLocaleString() : '—'} • {lastCron.spokes_enriched||0} enriched • {lastCron.release_notes_found||0} releases found
              </div>
            )}
          </div>

          {/* Manual run */}
          <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', overflow:'hidden', marginBottom:'20px' }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid #0d0d18' }}>
              <span style={{ fontSize:'13px', fontWeight:600, color:'#e2e8f0' }}>Manual Sync</span>
            </div>
            <div style={{ padding:'18px' }}>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'16px' }}>
                {[
                  { v:'full',          l:'Full Sync',        d:'All tiers' },
                  { v:'spokes',        l:'Spokes Only',      d:'Tier 1' },
                  { v:'properties',    l:'Properties Only',  d:'Tier 1' },
                  { v:'release_notes', l:'Release Notes',    d:'Tier 2' },
                  { v:'enrich',        l:'AI Enrich',        d:'Tier 3' },
                ].map(m=>(
                  <button key={m.v} onClick={()=>setAction(m.v)} style={{ padding:'7px 14px', borderRadius:'7px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', border:'1px solid', transition:'all .15s',
                    background: action===m.v ? 'rgba(108,99,255,.12)' : 'transparent',
                    borderColor: action===m.v ? 'rgba(108,99,255,.35)' : '#1a1a2e',
                    color: action===m.v ? '#8b85ff' : '#4b5563' }}>
                    {m.l}<span style={{ display:'block', fontSize:'8px', opacity:.5 }}>{m.d}</span>
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <button onClick={runSync} disabled={running} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 22px', background: running ? '#1a1a2e' : 'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:700, cursor: running?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  {running && <div style={{ width:'13px', height:'13px', border:'1.5px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .6s linear infinite' }}/>}
                  {running ? 'Running...' : `▶ Run ${action}`}
                </button>
                {result && (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color: result.ok ? '#4ade80' : '#f87171' }}>
                    {result.ok ? `✓ Done in ${result.duration_ms}ms` : `✗ ${result.error}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Live log terminal */}
          <div style={{ background:'#020208', border:'1px solid #0d0d18', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'9px 16px', borderBottom:'1px solid #0d0d18', display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ display:'flex', gap:'4px' }}>
                {['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:'7px', height:'7px', borderRadius:'50%', background:c, opacity:.7 }}/>)}
              </div>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#2a2a3a', letterSpacing:'1px' }}>SYNC LOG</span>
              {running && <div style={{ marginLeft:'auto', width:'6px', height:'6px', borderRadius:'50%', background:'#f59e0b', animation:'blink 1s step-end infinite' }}/>}
            </div>
            <div style={{ padding:'12px 16px', minHeight:'140px', maxHeight:'280px', overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'#1a1a2e transparent' }}>
              {logs.length === 0
                ? <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#1e1e2e' }}>awaiting run...</p>
                : logs.map(l=>(
                  <div key={l.id} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px', lineHeight:1.8, display:'flex', gap:'10px' }}>
                    <span style={{ color:'#1e1e2e', flexShrink:0 }}>{l.t}</span>
                    <span style={{ color: logColor[l.type]||'#6b7280' }}>{l.msg}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </AdminLayout>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });
