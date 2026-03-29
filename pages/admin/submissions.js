import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function SubmissionsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => { fetch(); }, [filter]);

  async function fetch() {
    setLoading(true);
    const res = await window.fetch(`/api/admin/submissions?status=${filter}`);
    const data = await res.json();
    setItems(data.submissions || []);
    setLoading(false);
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function review(id, action) {
    const res = await window.fetch('/api/admin/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reviewer_notes: reviewNote }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(action === 'approve' ? 'Spoke approved and added!' : 'Submission rejected');
      setSelected(null);
      setReviewNote('');
      fetch();
    } else showToast(data.error || 'Failed', 'error');
  }

  const counts = { all: items.length };

  return (
    <AdminLayout title="Spoke Submissions">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>{toast.msg}</div>
      )}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Spoke Submissions</h1>
            <p className="text-gray-400 text-sm mt-1">Community-submitted spokes pending review</p>
          </div>
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-all
                  ${filter === s ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-400">No {filter} submissions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold text-lg">{item.name}</h3>
                      <span className="text-xs font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{item.plugin_id}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-900/40 text-blue-300">{item.category}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3 leading-relaxed">{item.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      {item.credential_type && <span>🔑 {item.credential_type}</span>}
                      {item.min_version && <span>📦 Min: {item.min_version}</span>}
                      {item.store_url && <a href={item.store_url} target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300">🔗 Store link</a>}
                      <span>👤 {item.submitted_by || 'Anonymous'}</span>
                      <span>📅 {new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    {item.use_cases && (
                      <div className="mt-3 bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Use cases:</p>
                        <p className="text-xs text-gray-300">{item.use_cases}</p>
                      </div>
                    )}
                    {item.submitter_notes && (
                      <div className="mt-2 bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3">
                        <p className="text-xs text-yellow-500 mb-1">Submitter notes:</p>
                        <p className="text-xs text-gray-300">{item.submitter_notes}</p>
                      </div>
                    )}
                  </div>
                  {filter === 'pending' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => setSelected(selected === item.id ? null : item.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium">
                        Review
                      </button>
                    </div>
                  )}
                  {filter !== 'pending' && (
                    <span className={`text-xs px-3 py-1 rounded-lg shrink-0 ${filter === 'approved' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                      {filter}
                    </span>
                  )}
                </div>

                {/* Review panel */}
                {selected === item.id && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <label className="block text-xs text-gray-400 mb-2">Review notes (optional)</label>
                    <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2}
                      placeholder="Add notes for the submitter..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-purple-500 mb-3" />
                    <div className="flex gap-3">
                      <button onClick={() => review(item.id, 'approve')}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">
                        ✓ Approve & Add to Directory
                      </button>
                      <button onClick={() => review(item.id, 'reject')}
                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium">
                        ✗ Reject
                      </button>
                      <button onClick={() => { setSelected(null); setReviewNote(''); }}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default withAdminPage(SubmissionsPage);
