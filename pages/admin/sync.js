import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}
const h = () => ({ 'Content-Type':'application/json', 'x-admin-token': getAdminToken() });

function StatusDot({ ok, pulse }) {
  return (
    <div style={{ position:'relative', width:'8px', height:'8px', flexShrink:0 }}>
      <div style={{ position:'absolute', inset:0, borderRadius:'50%', background: ok ? '#4ade80' : '#f87171' }} />
      {pulse && ok && <div style={{ position:'absolute', inset:'-3px', borderRadius:'50%', background:'#4ade80', opacity:.3, animation:'ping 1.5s ease-in-out infinite' }}/>}
    </div>
  );
}

function Countdown({ target }) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!target) return;
    const update = () => {
      const ms = new Date(target) - Date.now();
      if (ms <= 0) { setLeft('now'); return; }
      const h = Math.floor(ms/3600000);
      const m = Math.floor((ms%3600000)/60000);
      const s = Math.floor((ms%60000)/1000);
      setLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [target]);
  return <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', color:'#8b85ff' }}>{left}</span>;
}

export default function SyncPage() {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [action,  setAction]  = useState('full');
  const [logs,    setLogs]    = useState([]);
  const [result,  setResult]  = useState(null);
  const logRef = useRef(null);

  const addLog = (msg, type='info') => {
    const t = new Date().toLocaleTimeString('en-US',{hour12:false});
    setLogs(p => [...p.slice(-100), { t, msg, type, id: Date.now()+Math.random() }]);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/scheduler-status', { headers: h() });
      const d = await r.json();
      if (d.success) setStatus(d);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
    const t = setInterval(loadStatus, 30000); // refresh every 30s
    return () => clearInterval(t);
  }, []);

  const runManual = async () => {
    if (running) return;
    setRunning(true); setResult(null); setLogs([]);
    addLog(`▶ Manual sync started — action: ${action}`, 'info');

    const steps = {
      full:          ['📦 Seeding 50 spokes from data file...','📦 Seeding 76 system properties...','📡 Fetching ServiceNow community RSS...','⟡ AI enriching empty spokes...'],
      spokes:        ['📦 Seeding 50 spokes from data file...'],
      properties:    ['📦 Seeding 76 system properties...'],
      release_notes: ['📡 Fetching ServiceNow community RSS...'],
      enrich:        ['⟡ AI enriching empty spokes...'],
    };
    (steps[action]||[]).forEach((s,i) => setTimeout(() => addLog(s,'info'), i*300));

    try {
      const r = await fetch('/api/admin/sync', { method:'POST', headers:h(), body: JSON.stringify({ action }) });
      const d = await r.json();
      if (d.success) {
        setResult({ ok:true, ...d });
        if (d.spokes_updated)  addLog(`✓ Spokes: ${d.spokes_updated} upserted`, 'success');
        if (d.props_updated)   addLog(`✓ Properties: ${d.props_updated} upserted`, 'success');
        if (d.releases_found)  addLog(`✓ Release notes: ${d.releases_found} spoke posts found`, 'success');
        else if (['full','release_notes'].includes(action)) addLog('○ RSS: no posts found (ServiceNow may not have released recently)', 'warn');
        if (d.enriched?.length) addLog(`✓ AI enriched: ${d.enriched.join(', ')}`, 'success');
        if (d.errors?.length)   d.errors.forEach(e => addLog('⚠ '+e, 'error'));
        addLog(`✓ Done in ${d.duration_ms}ms`, 'success');
        loadStatus();
      } else {
        setResult({ ok:false, error: d.error });
        addLog('✗ ' + d.error, 'error');
      }
    } catch(e) {
      setResult({ ok:false, error: e.message });
      addLog('✗ '+e.message, 'error');
    } finally {
      setRunning(false);
    }
  };

  const lc = { info:'#6b7280', success:'#4ade80', error:'#f87171', warn:'#f59e0b' };

  const jobs = status?.schedule ? [
    { key:'full_sync',     icon:'📦', label:'Full Sync',     desc:'Seeds all spokes + properties + RSS', ...status.schedule.full_sync },
    { key:'rss_check',     icon:'📡', label:'RSS Check',     desc:'ServiceNow community feed',           ...status.schedule.rss_check },
    { key:'ai_enrichment', icon:'⟡',  label:'AI Enrichment', desc:'Enriches empty spoke descriptions',  ...status.schedule.ai_enrichment },
  ] : [];

  return (
    <>
      <Head><title>Scheduler — snspokes Admin</title></Head>
      <AdminLayout title="Scheduler" breadcrumbs={['System','Scheduler']}>
        <div style={{ padding:'24px 28px', maxWidth:'1000px' }}>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
            <div>
              <h1 style={{ fontSize:'20px', fontWeight:700, color:'#f0f4ff', margin:'0 0 4px', fontFamily:"'Bricolage Grotesque',sans-serif" }}>
                Sync Scheduler
              </h1>
              <p style={{ color:'#374151', fontSize:'12px', fontFamily:"'JetBrains Mono',monospace" }}>
                Runs automatically inside the Next.js process — no cron daemon needed
              </p>
            </div>
            <button onClick={loadStatus} style={{ padding:'7px 14px', background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'8px', color:'#6b7280', fontSize:'12px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace" }}>↻ refresh</button>
          </div>

          {/* DB Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
            {loading ? [1,2,3].map(i=><div key={i} className="skeleton" style={{ height:'72px', borderRadius:'10px' }}/>)
            : [
              { l:'Spokes in DB',       v: status?.db?.spokes     ?? '—', sub: `${status?.db?.unenriched||0} unenriched`, color:'#6c63ff' },
              { l:'System Properties',  v: status?.db?.props      ?? '—', sub: 'indexed',                                color:'#8b5cf6' },
              { l:'Last Sync',          v: status?.last_sync?.duration_ms ? `${status.last_sync.duration_ms}ms` : 'Never', sub: status?.last_sync_at ? new Date(status.last_sync_at).toLocaleString() : '—', color:'#0ea5e9' },
            ].map(s=>(
              <div key={s.l} style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'10px', padding:'14px 16px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:`linear-gradient(to right,transparent,${s.color}60,transparent)` }}/>
                <div style={{ fontSize:'24px', fontWeight:800, color:'#f0f4ff', fontFamily:"'Bricolage Grotesque',sans-serif", lineHeight:1.2 }}>{s.v}</div>
                <div style={{ fontSize:'11px', color:'#374151', marginTop:'3px', fontFamily:"'JetBrains Mono',monospace" }}>{s.l}</div>
                <div style={{ fontSize:'10px', color:'#2a2a3a', marginTop:'2px', fontFamily:"'JetBrains Mono',monospace" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Scheduled Jobs */}
          <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', overflow:'hidden', marginBottom:'20px' }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid #0d0d18', display:'flex', alignItems:'center', gap:'10px' }}>
              <StatusDot ok pulse />
              <span style={{ fontSize:'13px', fontWeight:600, color:'#e2e8f0' }}>Scheduled Jobs</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginLeft:'4px' }}>running inside Next.js process</span>
            </div>
            <div>
              {loading ? [1,2,3].map(i=>(
                <div key={i} style={{ padding:'14px 18px', borderBottom:'1px solid #0d0d18' }}>
                  <div className="skeleton" style={{ height:'14px', borderRadius:'4px', width:'60%' }}/>
                </div>
              )) : jobs.map((job,i)=>(
                <div key={job.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom: i<jobs.length-1 ? '1px solid #0d0d18' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <StatusDot ok pulse={i===0} />
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'14px' }}>{job.icon}</span>
                        <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600 }}>{job.label}</span>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#6c63ff', background:'rgba(108,99,255,.1)', padding:'2px 7px', borderRadius:'4px' }}>{job.cron}</span>
                      </div>
                      <div style={{ color:'#4b5563', fontSize:'11.5px', marginTop:'3px' }}>{job.desc} — <span style={{ color:'#374151' }}>{job.label}</span></div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginBottom:'3px' }}>next run</div>
                    <Countdown target={job.next} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest release notes from SN */}
          {status?.release_notes?.length > 0 && (
            <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', overflow:'hidden', marginBottom:'20px' }}>
              <div style={{ padding:'12px 18px', borderBottom:'1px solid #0d0d18' }}>
                <span style={{ fontSize:'13px', fontWeight:600, color:'#e2e8f0' }}>Latest from ServiceNow</span>
                {status.release_notes_at && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginLeft:'10px' }}>fetched {new Date(status.release_notes_at).toLocaleDateString()}</span>}
              </div>
              <div style={{ padding:'10px 18px' }}>
                {status.release_notes.slice(0,5).map((n,i)=>(
                  <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{ display:'block', padding:'8px 0', borderBottom: i<4?'1px solid #0d0d18':'none', textDecoration:'none' }}>
                    <div style={{ color:'#e2e8f0', fontSize:'13px', marginBottom:'2px' }}>{n.title}</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a' }}>{n.pubDate}</div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Manual Run */}
          <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', overflow:'hidden', marginBottom:'20px' }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid #0d0d18' }}>
              <span style={{ fontSize:'13px', fontWeight:600, color:'#e2e8f0' }}>Manual Run</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginLeft:'10px' }}>trigger any job immediately</span>
            </div>
            <div style={{ padding:'18px' }}>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'16px' }}>
                {[
                  { v:'full',          l:'Full Sync',       d:'all tiers' },
                  { v:'spokes',        l:'Spokes Only',     d:'seed' },
                  { v:'properties',    l:'Properties',      d:'seed' },
                  { v:'release_notes', l:'RSS Only',        d:'tier 2' },
                  { v:'enrich',        l:'AI Enrich',       d:'tier 3' },
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
                <button onClick={runManual} disabled={running} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 22px', background: running ? '#1a1a2e' : 'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:700, cursor: running?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  {running && <div style={{ width:'13px', height:'13px', border:'1.5px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .6s linear infinite' }}/>}
                  {running ? 'Running...' : `▶ Run ${action}`}
                </button>
                {result && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color: result.ok ? '#4ade80' : '#f87171' }}>{result.ok ? `✓ ${result.duration_ms}ms` : `✗ ${result.error}`}</span>}
              </div>
            </div>
          </div>

          {/* Live log terminal */}
          <div style={{ background:'#020208', border:'1px solid #0d0d18', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'9px 16px', borderBottom:'1px solid #0d0d18', display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ display:'flex', gap:'4px' }}>{['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:'7px', height:'7px', borderRadius:'50%', background:c, opacity:.7 }}/>)}</div>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#2a2a3a', letterSpacing:'1px' }}>MANUAL RUN LOG</span>
              {running && <div style={{ marginLeft:'auto', width:'6px', height:'6px', borderRadius:'50%', background:'#f59e0b', animation:'blink 1s step-end infinite' }}/>}
            </div>
            <div ref={logRef} style={{ padding:'12px 16px', minHeight:'120px', maxHeight:'240px', overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'#1a1a2e transparent' }}>
              {logs.length === 0
                ? <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#1e1e2e' }}>awaiting manual run...</p>
                : logs.map(l=>(
                  <div key={l.id} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px', lineHeight:1.8, display:'flex', gap:'10px' }}>
                    <span style={{ color:'#1e1e2e', flexShrink:0 }}>{l.t}</span>
                    <span style={{ color: lc[l.type]||'#6b7280' }}>{l.msg}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </AdminLayout>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });
