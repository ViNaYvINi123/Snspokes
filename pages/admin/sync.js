import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

const h = () => ({ 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() });

function SyncPage() {
  const [status,    setStatus]    = useState(null);
  const [running,   setRunning]   = useState(false);
  const [lastSync,  setLastSync]  = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [action,    setAction]    = useState('full');

  const addLog = (msg, type='info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12:false });
    setLogs(p => [...p.slice(-50), { time, msg, type, id: Date.now() }]);
  };

  useEffect(() => {
    // Load last sync info
    fetch('/api/admin/properties?search=snspokes.last_sync', { headers: h() })
      .then(r => r.json())
      .then(d => {
        const p = (d.properties||[]).find(p => p.name === 'snspokes.last_sync');
        if (p?.value) {
          try { setLastSync(JSON.parse(p.value)); } catch {}
        }
      }).catch(() => {});
  }, []);

  const runSync = async () => {
    if (running) return;
    setRunning(true);
    setStatus(null);
    setLogs([]);
    addLog('Starting ServiceNow data sync...', 'info');
    addLog(`Mode: ${action}`, 'info');

    try {
      if (action === 'full' || action === 'spokes') addLog('Importing 50+ Integration Hub spokes...', 'info');
      if (action === 'full' || action === 'properties') addLog('Importing 76+ system properties...', 'info');
      if (action === 'full' || action === 'release_notes') addLog('Fetching ServiceNow community release notes...', 'info');

      const r = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({ action }),
      });
      const d = await r.json();

      if (d.success) {
        setStatus({ ok: true, ...d });
        if (d.spokes) addLog(`✓ Spokes: ${d.spokes.inserted} inserted, ${d.spokes.updated} updated, ${d.spokes.skipped} skipped`, 'success');
        if (d.properties) addLog(`✓ Properties: ${d.properties.inserted} inserted, ${d.properties.updated} updated`, 'success');
        if (d.release_notes?.length) addLog(`✓ Found ${d.release_notes.length} recent spoke release notes`, 'success');
        else addLog('○ Release notes: no RSS feed accessible from server (normal)', 'warn');
        if (d.errors?.length) d.errors.forEach(e => addLog(`⚠ ${e}`, 'error'));
        addLog(`✓ Sync complete in ${d.duration_ms}ms`, 'success');
        setLastSync(d);
      } else {
        setStatus({ ok: false, error: d.error });
        addLog(`✗ Sync failed: ${d.error}`, 'error');
      }
    } catch (err) {
      setStatus({ ok: false, error: err.message });
      addLog(`✗ Error: ${err.message}`, 'error');
    } finally {
      setRunning(false);
    }
  };

  const logColor = { info:'#6b7280', success:'#4ade80', error:'#f87171', warn:'#f59e0b' };

  return (
    <>
      <Head><title>ServiceNow Sync — snspokes Admin</title></Head>
      <AdminLayout title="ServiceNow Sync" breadcrumbs={['System','SN Sync']}>
        <div style={{ padding:'24px 28px', maxWidth:'900px' }}>

          <div style={{ marginBottom:'28px' }}>
            <h1 style={{ fontSize:'20px', fontWeight:700, color:'#f0f4ff', margin:0, fontFamily:"'Bricolage Grotesque',sans-serif" }}>
              ServiceNow Data Sync
            </h1>
            <p style={{ color:'#4b5563', fontSize:'13px', marginTop:'5px', fontFamily:"'JetBrains Mono',monospace" }}>
              Import spokes, system properties, and fetch release notes from ServiceNow
            </p>
          </div>

          {/* Last sync status */}
          {lastSync && (
            <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', padding:'16px 20px', marginBottom:'20px' }}>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#2a2a3a', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>LAST SYNC</p>
              <div style={{ display:'flex', gap:'24px', flexWrap:'wrap' }}>
                {[
                  { l:'completed', v: lastSync.completed_at ? new Date(lastSync.completed_at).toLocaleString() : '—' },
                  { l:'spokes_updated', v: lastSync.spokes ? `${lastSync.spokes.inserted+lastSync.spokes.updated}` : '—' },
                  { l:'properties_updated', v: lastSync.properties ? `${lastSync.properties.inserted+lastSync.properties.updated}` : '—' },
                  { l:'duration', v: lastSync.duration_ms ? `${lastSync.duration_ms}ms` : '—' },
                ].map(s=>(
                  <div key={s.l}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#2a2a3a', marginBottom:'3px', textTransform:'uppercase' }}>{s.l}</div>
                    <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sync controls */}
          <div style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'12px', overflow:'hidden', marginBottom:'20px' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #0d0d18' }}>
              <span style={{ fontSize:'13px', fontWeight:600, color:'#e2e8f0' }}>Run Sync</span>
            </div>
            <div style={{ padding:'20px' }}>

              {/* Mode selector */}
              <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
                {[
                  { v:'full', l:'Full Sync', d:'Spokes + Properties + Release Notes' },
                  { v:'spokes', l:'Spokes Only', d:'Import/update all 50+ spokes' },
                  { v:'properties', l:'Properties Only', d:'Import/update 76+ system properties' },
                  { v:'release_notes', l:'Release Notes', d:'Fetch latest ServiceNow updates' },
                ].map(m=>(
                  <button key={m.v} onClick={()=>setAction(m.v)}
                    style={{ padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', border:'1px solid', transition:'all .15s',
                      background: action===m.v ? 'rgba(108,99,255,.12)' : 'transparent',
                      borderColor: action===m.v ? 'rgba(108,99,255,.4)' : '#1a1a2e',
                      color: action===m.v ? '#8b85ff' : '#4b5563',
                    }}>
                    {m.l}
                    <span style={{ display:'block', fontSize:'9px', opacity:.6, marginTop:'2px' }}>{m.d}</span>
                  </button>
                ))}
              </div>

              <button onClick={runSync} disabled={running}
                style={{ display:'flex', alignItems:'center', gap:'8px', padding:'11px 24px', background: running ? '#1a1a2e' : 'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'9px', color:'#fff', fontSize:'13px', fontWeight:700, cursor: running?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", transition:'opacity .15s' }}>
                {running && <div style={{ width:'14px', height:'14px', border:'1.5px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .6s linear infinite' }}/>}
                {running ? 'Syncing...' : `▶ Run ${action === 'full' ? 'Full' : action.replace('_',' ')} Sync`}
              </button>

              {status && (
                <div style={{ marginTop:'14px', padding:'10px 14px', background: status.ok ? 'rgba(74,222,128,.07)' : 'rgba(248,113,113,.07)', border:`1px solid ${status.ok ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'}`, borderRadius:'8px', color: status.ok ? '#4ade80' : '#f87171', fontFamily:"'JetBrains Mono',monospace", fontSize:'12px' }}>
                  {status.ok ? `✓ Sync successful • ${status.duration_ms}ms` : `✗ ${status.error}`}
                </div>
              )}
            </div>
          </div>

          {/* Live log */}
          <div style={{ background:'#020208', border:'1px solid #0d0d18', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid #0d0d18', display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ display:'flex', gap:'4px' }}>
                {['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:'7px', height:'7px', borderRadius:'50%', background:c, opacity:.7 }}/>)}
              </div>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#2a2a3a', letterSpacing:'1px' }}>SYNC LOG</span>
              {running && <div style={{ marginLeft:'auto', width:'6px', height:'6px', borderRadius:'50%', background:'#f59e0b', animation:'blink 1s infinite' }}/>}
            </div>
            <div style={{ padding:'12px 16px', minHeight:'180px', maxHeight:'360px', overflowY:'auto' }}>
              {logs.length === 0 ? (
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#1e1e2e' }}>awaiting sync run...</p>
              ) : (
                logs.map(l=>(
                  <div key={l.id} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11.5px', lineHeight:'1.7', display:'flex', gap:'10px' }}>
                    <span style={{ color:'#1e1e2e', flexShrink:0 }}>{l.time}</span>
                    <span style={{ color: logColor[l.type] || '#6b7280' }}>{l.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* What gets synced */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginTop:'20px' }}>
            {[
              { icon:'🔌', title:'50+ Spokes', desc:'All Integration Hub spokes with actions, setup steps, common errors, tags, tier levels' },
              { icon:'⚙️', title:'76+ Properties', desc:'All core system properties with categories, types, defaults, and descriptions' },
              { icon:'📡', title:'Release Notes', desc:'Fetches latest spoke updates from ServiceNow community RSS when accessible' },
            ].map(c=>(
              <div key={c.title} style={{ background:'#0a0a12', border:'1px solid #1a1a2e', borderRadius:'10px', padding:'16px' }}>
                <div style={{ fontSize:'20px', marginBottom:'8px' }}>{c.icon}</div>
                <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600, marginBottom:'4px' }}>{c.title}</div>
                <div style={{ color:'#4b5563', fontSize:'11.5px', lineHeight:1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </>
  );
}

export default withAdminPage(SyncPage);
export const getServerSideProps = async () => ({ props: {} });
