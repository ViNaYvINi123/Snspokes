import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function ExportPage() {
  const [loading, setLoading] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  async function exportData(type, format = 'csv') {
    setLoading(`${type}-${format}`);
    try {
      const r = await fetch(`/api/admin/export?type=${type}&format=${format}`, {
        headers: { 'x-admin-token': localStorage.getItem('admin_token') || '' }
      });
      if (!r.ok) { showToast('Export failed', 'error'); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snspokes_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`${type} exported as ${format.toUpperCase()}!`);
    } catch { showToast('Export failed', 'error'); }
    setLoading(null);
  }

  const exports = [
    { id: 'users',    label: 'Users',          icon: '👥', desc: 'All user accounts and plans' },
    { id: 'spokes',   label: 'Spokes',          icon: '🔌', desc: 'All spoke directory entries' },
    { id: 'payments', label: 'Payments',        icon: '💳', desc: 'Payment and subscription history' },
    { id: 'searches', label: 'Search Analytics',icon: '🔍', desc: 'Search query history' },
    { id: 'errors',   label: 'Error Logs',      icon: '⚠️', desc: 'System error logs' },
  ];

  return (
    <AdminLayout title="Data Export">
      {toast && <div style={{ position:'fixed', top:'16px', right:'16px', zIndex:50, padding:'12px 20px', borderRadius:'12px', fontSize:'13px', fontWeight:'600', boxShadow:'0 10px 25px rgba(0,0,0,0.3)', background: toast.type === 'success' ? '#16a34a' : '#dc2626', color:'#fff' }}>{toast.msg}</div>}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Data Export</h1>
        <p className="text-gray-400 text-sm mb-6">Download your data as CSV or JSON for analysis or backup.</p>
        <div className="grid md:grid-cols-2 gap-4">
          {exports.map(exp => (
            <div key={exp.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{exp.icon}</span>
                <div>
                  <div className="font-medium text-white">{exp.label}</div>
                  <div className="text-xs text-gray-400">{exp.desc}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {['csv', 'json'].map(fmt => (
                  <button key={fmt} onClick={() => exportData(exp.id, fmt)}
                    disabled={loading === `${exp.id}-${fmt}`}
                    className="text-xs bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 px-3 py-1.5 rounded-lg uppercase disabled:opacity-50">
                    {loading === `${exp.id}-${fmt}` ? '...' : fmt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(ExportPage);
