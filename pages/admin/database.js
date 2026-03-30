import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

function AdminDatabase() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM sn_users LIMIT 10;');
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [migrationSql, setMigrationSql] = useState('');
  const [migrationMsg, setMigrationMsg] = useState('');
  const [migrationLoading, setMigrationLoading] = useState(false);

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/database?action=status');
      setStatus(res.data);
    } catch (err) {
      setStatus({ success: false, status: 'error', error: err.response?.data?.error || err.message });
    } finally { setLoading(false); }
  };

  const runQuery = async () => {
    if (!sqlQuery.trim()) return;
    setQueryLoading(true); setQueryError(''); setQueryResult(null);
    try {
      const res = await axios.get('/api/admin/database', { params: { action: 'query', sql: sqlQuery } });
      setQueryResult(res.data);
    } catch (err) { setQueryError(err.response?.data?.error || 'Query failed'); }
    finally { setQueryLoading(false); }
  };

  const runMigration = async () => {
    if (!migrationSql.trim()) return;
    if (!confirm('Run this migration? This cannot be undone.')) return;
    setMigrationLoading(true); setMigrationMsg('');
    try {
      const res = await axios.post('/api/admin/database', { action: 'run_migration', sql: migrationSql });
      setMigrationMsg('✅ ' + res.data.message);
      fetchStatus();
    } catch (err) { setMigrationMsg('❌ ' + (err.response?.data?.error || 'Migration failed')); }
    finally { setMigrationLoading(false); }
  };

  const QUICK_QUERIES = [
    { label: 'Recent Users', sql: 'SELECT id, name, email, plan, created_at FROM sn_users ORDER BY created_at DESC LIMIT 10;' },
    { label: 'All Spokes', sql: 'SELECT id, slug, name, category, view_count FROM sn_spokes ORDER BY view_count DESC LIMIT 20;' },
    { label: 'Search Stats', sql: "SELECT query, COUNT(*) as count FROM sn_search_analytics GROUP BY query ORDER BY count DESC LIMIT 10;" },
    { label: 'Revenue', sql: "SELECT status, COUNT(*) as count, SUM(amount) as total FROM sn_subscriptions GROUP BY status;" },
    { label: 'DB Size', sql: "SELECT tablename, pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) as size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(quote_ident(tablename)) DESC;" },
  ];

  return (
    <>
      <Head><title>Database — Admin snspokes</title></Head>
      <AdminLayout title="Database Management">

        {/* Status Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b6b8a' }}>Connecting to database...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '14px', border: `1px solid ${status?.status === 'connected' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{status?.status === 'connected' ? '🟢' : '🔴'}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: status?.status === 'connected' ? '#4ade80' : '#f87171' }}>{status?.status === 'connected' ? 'Connected' : 'Error'}</div>
                <div style={{ fontSize: '12px', color: '#6b6b8a', marginTop: '4px' }}>Database Status</div>
              </div>
              {status?.status === 'connected' && (
                <>
                  <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '14px', border: '1px solid #1e1e2e' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#6c63ff' }}>{status.ping_ms}ms</div>
                    <div style={{ fontSize: '12px', color: '#6b6b8a', marginTop: '4px' }}>Response Time</div>
                  </div>
                  <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '14px', border: '1px solid #1e1e2e' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>💾</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{status.db_size}</div>
                    <div style={{ fontSize: '12px', color: '#6b6b8a', marginTop: '4px' }}>Database Size</div>
                  </div>
                  <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '14px', border: '1px solid #1e1e2e' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔗</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#a855f7' }}>{status.connections}</div>
                    <div style={{ fontSize: '12px', color: '#6b6b8a', marginTop: '4px' }}>Active Connections</div>
                  </div>
                </>
              )}
            </div>

            {/* Record Counts */}
            {status?.counts && (
              <div style={{ background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>📊 Record Counts</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                  {Object.entries(status.counts).map(([key, val]) => (
                    <div key={key} style={{ textAlign: 'center', padding: '16px', background: '#0a0a14', borderRadius: '10px', border: '1px solid #1e1e2e' }}>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#6c63ff' }}>{parseInt(val).toLocaleString()}</div>
                      <div style={{ fontSize: '12px', color: '#6b6b8a', marginTop: '4px', textTransform: 'capitalize' }}>{key}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tables */}
            {status?.tables && (
              <div style={{ background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', marginBottom: '24px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>🗄️ Database Tables</h3>
                  <button onClick={fetchStatus} style={{ padding: '6px 14px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '8px', color: '#8b85ff', cursor: 'pointer', fontSize: '13px', fontFamily: 'Syne, sans-serif' }}>Refresh</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e1e2e' }}>
                      {['Table Name', 'Size'].map(h => (
                        <th key={h} style={{ padding: '12px 20px', textAlign: 'left', color: '#6b6b8a', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {status.tables.map(t => (
                      <tr key={t.tablename} style={{ borderBottom: '1px solid #1e1e2e' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#8b85ff' }}>{t.tablename}</td>
                        <td style={{ padding: '12px 20px', color: '#9999bb', fontSize: '13px' }}>{t.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* SQL Query Runner */}
        <div style={{ background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>🔍 Query Runner (SELECT only)</h3>
          <p style={{ color: '#6b6b8a', fontSize: '13px', marginBottom: '16px' }}>Run read-only SELECT queries to inspect data. No destructive operations allowed.</p>

          {/* Quick queries */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {QUICK_QUERIES.map(q => (
              <button key={q.label} onClick={() => setSqlQuery(q.sql)} style={{ padding: '5px 12px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', color: '#8b85ff', cursor: 'pointer', fontSize: '12px', fontFamily: 'Syne, sans-serif', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(108,99,255,0.08)'}
              >{q.label}</button>
            ))}
          </div>

          <textarea value={sqlQuery} onChange={e => setSqlQuery(e.target.value)} rows={4}
            style={{ width: '100%', padding: '12px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#a8b2d8', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', outline: 'none', resize: 'vertical', marginBottom: '12px' }} />

          <button onClick={runQuery} disabled={queryLoading} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: '600', opacity: queryLoading ? 0.7 : 1 }}>
            {queryLoading ? 'Running...' : '▶ Run Query'}
          </button>

          {queryError && <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>⚠️ {queryError}</div>}

          {queryResult && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ color: '#6b6b8a', fontSize: '12px', marginBottom: '8px' }}>{queryResult.count} rows returned</p>
              {queryResult.rows && queryResult.rows.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                    <thead>
                      <tr style={{ background: '#0a0a14' }}>
                        {Object.keys(queryResult.rows[0]).map(col => (
                          <th key={col} style={{ padding: '8px 12px', textAlign: 'left', color: '#6b6b8a', borderBottom: '1px solid #1e1e2e', whiteSpace: 'nowrap' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #1e1e2e' }}>
                          {Object.values(row).map((val, j) => (
                            <td key={j} style={{ padding: '8px 12px', color: '#c4c4e0', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {val === null ? <span style={{ color: '#6b6b8a', fontStyle: 'italic' }}>null</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Migration Runner */}
        <div style={{ background: '#0f0f1a', borderRadius: '16px', border: '1px solid rgba(251,191,36,0.2)', padding: '24px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>⚠️ Migration Runner</h3>
          <p style={{ color: '#fbbf24', fontSize: '13px', marginBottom: '16px' }}>Run CREATE/ALTER/INSERT SQL migrations. Use with caution — changes are permanent.</p>
          <textarea value={migrationSql} onChange={e => setMigrationSql(e.target.value)} rows={5} placeholder="ALTER TABLE sn_users ADD COLUMN IF NOT EXISTS phone TEXT;"
            style={{ width: '100%', padding: '12px', background: '#0a0a14', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '10px', color: '#a8b2d8', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', outline: 'none', resize: 'vertical', marginBottom: '12px' }} />
          <button onClick={runMigration} disabled={migrationLoading} style={{ padding: '10px 24px', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '10px', color: '#fbbf24', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: '600', opacity: migrationLoading ? 0.7 : 1 }}>
            {migrationLoading ? 'Running...' : '⚡ Run Migration'}
          </button>
          {migrationMsg && <div style={{ marginTop: '12px', padding: '12px', background: migrationMsg.startsWith('✅') ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${migrationMsg.startsWith('✅') ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px', color: migrationMsg.startsWith('✅') ? '#4ade80' : '#f87171', fontSize: '13px' }}>{migrationMsg}</div>}
        </div>

      </AdminLayout>
    </>
  );
}


export default withAdminPage(AdminDatabase);

export const getServerSideProps = async () => ({ props: {} });
