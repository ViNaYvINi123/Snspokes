import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function SpokeVersionsPage() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchVersions(); }, []);

  async function fetchVersions() {
    const r = await fetch('/api/admin/spoke-versions', { headers: { 'x-admin-token': localStorage.getItem('admin_token') || '' } });
    const d = await r.json();
    if (d.success) setVersions(d.versions || []);
    setLoading(false);
  }

  const filtered = versions.filter(v =>
    !search || v.spoke_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.version?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Spoke Versions">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Spoke Version Tracking</h1>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search spokes..."
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500 w-64" />
        </div>
        {loading ? <div className="text-gray-400">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Spoke', 'Current Version', 'Min SN Version', 'Last Updated', 'Status'].map(h => (
                    <th key={h} className="text-left py-3 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-3 text-white font-medium">{v.spoke_name || v.slug}</td>
                    <td className="py-3 text-gray-300">{v.version || '—'}</td>
                    <td className="py-3 text-gray-300">{v.min_version || '—'}</td>
                    <td className="py-3 text-gray-400">{v.updated_at ? new Date(v.updated_at).toLocaleDateString() : '—'}</td>
                    <td className="py-3">
                      <span style={{ fontSize:'11px', padding:'4px 8px', borderRadius:'4px', background: v.is_active ? 'rgba(74,222,128,0.15)' : '#111827', color: v.is_active ? '#4ade80' : '#6b7280' }}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-gray-500">No versions found</div>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(SpokeVersionsPage);
