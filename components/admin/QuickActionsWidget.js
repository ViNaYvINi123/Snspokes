import { useState } from 'react';

const ACTIONS = [
  { id: 'clear_cache',        icon: '🗑️',  label: 'Clear Cache',       color: 'blue' },
  { id: 'trigger_backup',     icon: '💾',  label: 'Backup Now',        color: 'green' },
  { id: 'resolve_all_errors', icon: '✅',  label: 'Resolve Errors',    color: 'yellow' },
  { id: 'maintenance_mode',   icon: '🚨',  label: 'Maintenance',       color: 'red', toggle: true },
];

export default function QuickActionsWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [maintenance, setMaintenance] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function runAction(actionId) {
    const confirmMsgs = {
      trigger_backup:     'Start a backup now?',
      resolve_all_errors: 'Resolve all open errors?',
      maintenance_mode:   maintenance ? 'Turn OFF maintenance mode?' : '⚠️ Turn ON maintenance mode?',
    };
    if (confirmMsgs[actionId] && !confirm(confirmMsgs[actionId])) return;

    setLoading(actionId);
    try {
      const params = actionId === 'maintenance_mode' ? { enabled: !maintenance } : {};
      const r = await fetch('/api/admin/quick-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ action: actionId, params }),
      });
      const d = await r.json();
      if (d.success) {
        showToast(d.message);
        if (actionId === 'maintenance_mode') setMaintenance(m => !m);
      } else {
        showToast(d.error || 'Failed', 'error');
      }
    } catch { showToast('Action failed', 'error'); }
    setLoading(null);
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {toast.msg}
        </div>
      )}

      {/* Action buttons (shown when open) */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 flex flex-col gap-2 items-end">
          {ACTIONS.map(a => (
            <button key={a.id} onClick={() => runAction(a.id)}
              disabled={loading === a.id}
              title={a.label}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all
                bg-gray-900 border border-gray-700 hover:border-${a.color}-500/50 text-white disabled:opacity-50
                ${a.id === 'maintenance_mode' && maintenance ? 'border-red-500/50 text-red-400' : ''}`}>
              {loading === a.id ? <span className="animate-spin">⏳</span> : <span>{a.icon}</span>}
              <span>{a.id === 'maintenance_mode' && maintenance ? 'Maintenance ON' : a.label}</span>
            </button>
          ))}

          {/* Divider + navigate */}
          <div className="w-full h-px bg-gray-700 my-1" />
          <a href="/admin/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white shadow-lg">
            🎯 Command Center
          </a>
          <a href="/admin/activity-feed"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 text-white shadow-lg">
            📡 Live Feed
          </a>
        </div>
      )}

      {/* FAB button */}
      <button onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-xl transition-all
          ${open ? 'bg-gray-700 rotate-45' : 'bg-purple-600 hover:bg-purple-700'} text-white`}>
        {open ? '✕' : '⚡'}
      </button>
    </>
  );
}
