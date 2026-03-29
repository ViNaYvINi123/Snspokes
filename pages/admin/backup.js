import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

function AdminBackup() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 4000); };

  const fetchBackups = async () => {
    try {
      const res = await axios.get('/api/admin/backup');
      setBackups(res.data.backups || []);
    } catch (err) {
      if (err.response?.status === 401) window.location.href = '/admin';
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchBackups(); }, []);

  const runBackup = async () => {
    setRunning(true);
    try {
      const res = await axios.post('/api/admin/backup');
      showToast(`Backup created: ${res.data.file} (${(res.data.size_bytes / 1024).toFixed(1)}KB)`);
      fetchBackups();
    } catch (err) {
      showToast(err.response?.data?.error || 'Backup failed', 'error');
    } finally { setRunning(false); }
  };

  return (
    <>
      <Head><title>DB Backup — snspokes Admin</title></Head>
      <AdminLayout title="Database Backup" breadcrumbs={['System', 'DB Backup']}>
        <div style={{ padding: '12px 16px', background: '#052e16', border: '1px solid #bbf7d0', borderRadius: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#15803d', marginBottom: '2px' }}>Automatic backups run daily at 2:00 AM</p>
            <p style={{ fontSize: '12px', color: '#16a34a' }}>Last 7 days kept. Stored at <code style={{ background: '#dcfce7', padding: '1px 5px', borderRadius: '3px' }}>/tmp/snspokes-backups</code></p>
          </div>
          <button onClick={runBackup} disabled={running} style={{ padding: '9px 18px', background: running ? '#9ca3af' : '#e2e8f0', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {running && <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
            {running ? 'Creating backup...' : '💾 Backup Now'}
          </button>
        </div>

        <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2e' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>Backup Files ({backups.length})</h3>
          </div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
          ) : backups.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>💾</div>
              <p style={{ fontSize: '14px', color: '#9999bb' }}>No backups yet</p>
              <p style={{ fontSize: '12px' }}>Click "Backup Now" to create your first backup</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#0d0d1a', borderBottom: '1px solid #1e1e2e' }}>
                  {['Filename', 'Size', 'Created', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backups.map((b, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px 16px' }}><code style={{ fontSize: '12px', color: '#9999bb' }}>{b.name}</code></td>
                    <td style={{ padding: '12px 16px', color: '#6b6b8a' }}>{(b.size_bytes / 1024).toFixed(1)} KB</td>
                    <td style={{ padding: '12px 16px', color: '#6b6b8a', fontSize: '12px' }}>{new Date(b.created_at).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', background: '#052e16', border: '1px solid #bbf7d0', borderRadius: '20px', fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>✅ Ready</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {toast && (
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, padding: '12px 18px', borderRadius: '10px', background: toast.type === 'error' ? '#2d0a0a' : '#052e16', border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`, color: toast.type === 'error' ? '#dc2626' : '#16a34a', fontSize: '13px', fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
            {toast.type === 'error' ? '⚠️' : '✅'} {toast.text}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    </>
  );
}

export default withAdminPage(AdminBackup);
