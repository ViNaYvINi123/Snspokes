import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', url: '', events: [] });
  const [toast, setToast] = useState(null);

  const EVENTS = ['new_user', 'plan_upgrade', 'spoke_submission', 'error_spike', 'backup_complete', 'backup_failed'];

  useEffect(() => { fetchWebhooks(); }, []);

  async function fetchWebhooks() {
    const r = await fetch('/api/admin/webhooks', { headers: { 'x-admin-token': localStorage.getItem('admin_token') || '' } });
    const d = await r.json();
    if (d.success) setWebhooks(d.webhooks || []);
    setLoading(false);
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  async function createWebhook(e) {
    e.preventDefault();
    if (!form.name || !form.url) return showToast('Name and URL required', 'error');
    const r = await fetch('/api/admin/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' },
      body: JSON.stringify({ action: 'create', ...form }),
    });
    const d = await r.json();
    if (d.success) { showToast('Webhook created!'); setForm({ name: '', url: '', events: [] }); fetchWebhooks(); }
    else showToast(d.error || 'Failed', 'error');
  }

  async function deleteWebhook(id) {
    if (!confirm('Delete this webhook?')) return;
    await fetch('/api/admin/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    fetchWebhooks();
  }

  async function testWebhook(id) {
    const r = await fetch('/api/admin/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' },
      body: JSON.stringify({ action: 'test', id }),
    });
    const d = await r.json();
    showToast(d.success ? 'Test sent! ✅' : 'Test failed ❌', d.success ? 'success' : 'error');
  }

  return (
    <AdminLayout title="Webhooks">
      {toast && <div style={{ position:'fixed', top:'16px', right:'16px', zIndex:50, padding:'12px 20px', borderRadius:'12px', fontSize:'13px', fontWeight:'600', boxShadow:'0 10px 25px rgba(0,0,0,0.3)', background: toast.type === 'success' ? '#16a34a' : '#dc2626', color:'#fff' }}>{toast.msg}</div>}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Webhooks</h1>

        {/* Create form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-white mb-4">Add Webhook</h2>
          <form onSubmit={createWebhook} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Slack Alerts"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">URL</label>
                <input value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))} placeholder="https://hooks.slack.com/..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">Events</label>
              <div className="flex flex-wrap gap-2">
                {EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.events.includes(ev)}
                      onChange={e => setForm(f => ({ ...f, events: e.target.checked ? [...f.events, ev] : f.events.filter(x => x !== ev) }))}
                      className="rounded" />
                    <span className="text-xs text-gray-300">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-medium">+ Add Webhook</button>
          </form>
        </div>

        {/* Webhooks list */}
        {loading ? <div className="text-gray-400">Loading...</div> :
         webhooks.length === 0 ? <div className="text-center py-12 text-gray-500">No webhooks configured</div> : (
          <div className="space-y-3">
            {webhooks.map(w => (
              <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{w.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{w.url}</div>
                  <div className="flex gap-1 mt-1">
                    {(w.events || []).map(ev => <span key={ev} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{ev}</span>)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => testWebhook(w.id)} className="text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-3 py-1.5 rounded-lg">Test</button>
                  <button onClick={() => deleteWebhook(w.id)} className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600/40 px-3 py-1.5 rounded-lg">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default withAdminPage(WebhooksPage);

export const getServerSideProps = async () => ({ props: {} });
