import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function HealthTimelinePage() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const r = await fetch('/api/admin/health-timeline', { headers: { 'x-admin-token': localStorage.getItem('admin_token') || '' } });
    const d = await r.json();
    if (d.success) setSnapshots(d.snapshots || []);
    setLoading(false);
  }

  return (
    <AdminLayout title="Health Timeline">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Health Timeline</h1>
        {loading ? <div className="text-gray-400">Loading...</div> :
         snapshots.length === 0 ? <div className="text-center py-12 text-gray-500">No health data yet. Runs daily via n8n workflow14.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Time', 'Active Users', 'Searches', 'Errors', 'DB Connections'].map(h => (
                    <th key={h} className="text-left py-3 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshots.map(s => (
                  <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-3 text-gray-300">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="py-3 text-white">{s.active_users}</td>
                    <td className="py-3 text-blue-400">{s.searches_last_hour}</td>
                    <td className={`py-3 ${s.errors_last_hour > 0 ? 'text-red-400' : 'text-green-400'}`}>{s.errors_last_hour}</td>
                    <td className="py-3 text-gray-300">{s.db_connections}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
export default withAdminPage(HealthTimelinePage);
