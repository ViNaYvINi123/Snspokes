import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

function AdminLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const res = await axios.get('/api/admin/logs');
      setLogs(res.data.logs || []);
    } catch (err) {
      if (err.response?.status === 401) router.push('/admin');
    } finally { setLoading(false); }
  };

  const actionColors = {
    ban_user: '#f87171', unban_user: '#4ade80', delete_user: '#ef4444',
    upgrade_user: '#6c63ff', create_spoke: '#4ade80', update_spoke: '#fbbf24',
    delete_spoke: '#f87171',
  };

  const actionIcons = {
    ban_user: '🚫', unban_user: '✅', delete_user: '🗑️',
    upgrade_user: '⬆️', create_spoke: '➕', update_spoke: '✏️',
    delete_spoke: '🗑️',
  };

  return (
    <>
      <Head><title>Activity Logs — Admin snspokes</title></Head>
      <AdminLayout title="Activity Logs">
        <div style={{ background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>Admin Activity Log</h3>
            <button onClick={fetchLogs} style={{ padding: '6px 14px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '8px', color: '#8b85ff', cursor: 'pointer', fontSize: '13px', fontFamily: 'Syne, sans-serif' }}>Refresh</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b6b8a' }}>Loading logs...</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b6b8a' }}>No activity logs yet</div>
          ) : (
            <div style={{ padding: '8px' }}>
              {logs.map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px', borderRadius: '10px', marginBottom: '4px', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${actionColors[log.action] || '#6b6b8a'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    {actionIcons[log.action] || '📋'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ color: actionColors[log.action] || '#9999bb', fontSize: '13px', fontWeight: '600', textTransform: 'replace' }}>{log.action?.replace(/_/g, ' ').toUpperCase()}</span>
                      <span style={{ padding: '1px 6px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '4px', fontSize: '11px', color: '#6b6b8a' }}>{log.target_type} #{log.target_id}</span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div style={{ color: '#6b6b8a', fontSize: '12px' }}>{JSON.stringify(log.details)}</div>
                    )}
                  </div>
                  <span style={{ color: '#6b6b8a', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(AdminLogs);
