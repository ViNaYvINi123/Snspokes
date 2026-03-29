import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

function ProgressBar({ value, max, color = '#6c63ff' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b6b8a', marginBottom: '5px' }}>
        <span>{value} / {max} spokes enriched</span>
        <span style={{ fontWeight: '600', color }}>{pct}%</span>
      </div>
      <div style={{ height: '8px', background: '#111122', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, #a855f7)`, borderRadius: '4px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function SpokeSeeder() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [enriching, setEnriching] = useState(null);
  const [log, setLog] = useState([]);
  const [batchSize, setBatchSize] = useState(3);
  const [toast, setToast] = useState(null);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLog(l => [{ msg, type, time }, ...l].slice(0, 50));
  };
  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 4000); };

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/admin/seed-spokes');
      setStats(res.data.stats);
      setPending(res.data.pending_sample || []);
    } catch (err) {
      if (err.response?.status === 401) window.location.href = '/admin';
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const enrichOne = async (slug, name) => {
    setEnriching(slug);
    addLog(`Starting enrichment: ${name}...`, 'info');
    try {
      const res = await axios.post('/api/admin/seed-spokes', { action: 'enrich_one', slug });
      addLog(`✅ ${name} enriched via ${res.data.source || 'AI'}`, 'success');
      showToast(`${name} enriched successfully`);
      fetchStatus();
    } catch (err) {
      addLog(`❌ ${name} failed: ${err.response?.data?.error || err.message}`, 'error');
      showToast(`Failed: ${name}`, 'error');
    } finally { setEnriching(null); }
  };

  const enrichBatch = async () => {
    setRunning(true);
    addLog(`Starting batch enrichment (${batchSize} spokes)...`, 'info');
    try {
      const res = await axios.post('/api/admin/seed-spokes', { action: 'enrich_batch', batch_size: batchSize });
      const { enriched, results } = res.data;
      addLog(`Batch complete: ${enriched} enriched`, 'success');
      results?.forEach(r => {
        if (r.status === 'success') addLog(`✅ ${r.slug}`, 'success');
        else addLog(`❌ ${r.slug}: ${r.error}`, 'error');
      });
      showToast(`Batch complete: ${enriched}/${batchSize} spokes enriched`);
      fetchStatus();
    } catch (err) {
      addLog(`❌ Batch failed: ${err.response?.data?.error || err.message}`, 'error');
      showToast('Batch failed', 'error');
    } finally { setRunning(false); }
  };

  const total = parseInt(stats?.total || 0);
  const enriched = parseInt(stats?.enriched || 0);
  const needsWork = parseInt(stats?.needs_enrichment || 0);

  return (
    <>
      <Head><title>Spoke Content Seeder — snspokes Admin</title></Head>
      <AdminLayout title="Spoke Content Seeder" breadcrumbs={['Catalog', 'Spoke Seeder']}>

        {/* Info banner */}
        <div style={{ padding: '14px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#1d4ed8', marginBottom: '4px' }}>🤖 How this works</p>
          <p style={{ fontSize: '12px', color: '#3b82f6', lineHeight: '1.6' }}>
            <strong>Step 1:</strong> Run <code style={{ background: '#dbeafe', padding: '1px 5px', borderRadius: '3px' }}>database_seed_spokes.sql</code> to load 50 real verified ServiceNow spokes into your DB.<br />
            <strong>Step 2:</strong> Use this panel to enrich each spoke with full AI-generated content via OpenRouter.<br />
            <strong>AI generates:</strong> setup steps, real actions, common errors, code examples — all grounded in real ServiceNow docs.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Status card */}
          <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' }}>📊 Enrichment Status</h3>
            {loading ? <div style={{ color: '#9ca3af', fontSize: '13px' }}>Loading...</div> : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: '#0d0d1a', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#e2e8f0' }}>{total}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Total Spokes</div>
                  </div>
                  <div style={{ padding: '12px', background: '#052e16', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#16a34a' }}>{enriched}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Enriched</div>
                  </div>
                  <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#d97706' }}>{needsWork}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Needs Work</div>
                  </div>
                </div>
                <ProgressBar value={enriched} max={total} />
              </>
            )}
          </div>

          {/* Batch control */}
          <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' }}>⚡ Batch Enrichment</h3>
            <p style={{ fontSize: '12px', color: '#6b6b8a', marginBottom: '14px', lineHeight: '1.5' }}>
              Process multiple spokes at once using OpenRouter AI. Runs sequentially with 2s delay between each to respect rate limits.
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: '#9999bb', fontWeight: '500', whiteSpace: 'nowrap' }}>Batch size:</label>
              <select value={batchSize} onChange={e => setBatchSize(parseInt(e.target.value))}
                style={{ padding: '6px 10px', border: '1px solid #1e1e2e', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}>
                {[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>{n} spoke{n > 1 ? 's' : ''} (~{n * 15}s)</option>)}
              </select>
            </div>
            <button onClick={enrichBatch} disabled={running || needsWork === 0}
              style={{ width: '100%', padding: '10px', background: running || needsWork === 0 ? '#9ca3af' : '#e2e8f0', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: running || needsWork === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {running && <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
              {running ? `Enriching ${batchSize} spokes...` : needsWork === 0 ? '✅ All spokes enriched!' : `▶ Enrich ${batchSize} Spoke${batchSize > 1 ? 's' : ''} Now`}
            </button>
          </div>
        </div>

        {/* Pending spokes */}
        {pending.length > 0 && (
          <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>📋 Needs Enrichment (showing {pending.length})</h3>
              <button onClick={fetchStatus} style={{ background: 'none', border: 'none', color: '#6c63ff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Refresh</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#0d0d1a', borderBottom: '1px solid #1e1e2e' }}>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Spoke</th>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                  <th style={{ padding: '9px 14px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(sp => (
                  <tr key={sp.slug} style={{ borderBottom: '1px solid #1e1e2e' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontWeight: '600', color: '#e2e8f0' }}>{sp.name}</span>
                      <code style={{ marginLeft: '8px', fontSize: '11px', color: '#9ca3af' }}>{sp.slug}</code>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', background: '#ede9fe', color: '#7c3aed', borderRadius: '20px', fontSize: '11px', fontWeight: '600', border: '1px solid #c4b5fd' }}>{sp.category}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button onClick={() => enrichOne(sp.slug, sp.name)} disabled={enriching === sp.slug || running}
                        style={{ padding: '5px 14px', background: enriching === sp.slug ? '#9ca3af' : '#6c63ff', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: enriching === sp.slug ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {enriching === sp.slug ? (<><div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />Enriching...</>) : '🤖 Enrich'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Activity log */}
        <div style={{ background: '#e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Activity Log</h3>
            <button onClick={() => setLog([])} style={{ background: 'none', border: 'none', color: '#4b5563', fontSize: '11px', cursor: 'pointer' }}>Clear</button>
          </div>
          <div style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', maxHeight: '200px', overflowY: 'auto' }}>
            {log.length === 0 ? (
              <div style={{ color: '#4b5563' }}>// Activity will appear here...</div>
            ) : (
              log.map((l, i) => (
                <div key={i} style={{ marginBottom: '4px', color: l.type === 'error' ? '#f87171' : l.type === 'success' ? '#4ade80' : '#9ca3af' }}>
                  <span style={{ color: '#4b5563' }}>{l.time}</span> {l.msg}
                </div>
              ))
            )}
          </div>
        </div>

        {toast && (
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, padding: '12px 18px', borderRadius: '10px', background: toast.type === 'error' ? '#2d0a0a' : '#052e16', border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`, color: toast.type === 'error' ? '#dc2626' : '#16a34a', fontSize: '13px', fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {toast.type === 'error' ? '⚠️' : '✅'} {toast.text}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(SpokeSeeder);
