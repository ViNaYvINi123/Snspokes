import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  async function fetchNotifications() {
    const r = await fetch('/api/admin/notifications', { headers: { 'x-admin-token': localStorage.getItem('admin_token') || '' } });
    const d = await r.json();
    if (d.success) setNotifications(d.notifications || []);
    setLoading(false);
  }

  async function markRead(id) {
    await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' },
      body: JSON.stringify({ id, action: 'mark_read' }),
    });
    fetchNotifications();
  }

  async function markAllRead() {
    await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    fetchNotifications();
  }

  const typeColors = { error: 'red', warning: 'yellow', info: 'blue', success: 'green' };
  const unread = notifications.filter(n => !n.read_at).length;

  return (
    <AdminLayout title="Notifications">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            {unread > 0 && <p className="text-gray-400 text-sm mt-1">{unread} unread</p>}
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">
              Mark all read
            </button>
          )}
        </div>
        {loading ? <div className="text-gray-400">Loading...</div> :
         notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">🔔</div>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const c = typeColors[n.type] || 'gray';
              return (
                <div key={n.id} className={`bg-gray-900 border rounded-xl p-4 flex items-start justify-between gap-4 ${!n.read_at ? `border-${c}-500/40` : 'border-gray-800'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full bg-${c}-400`} />
                      <span className="text-white font-medium text-sm">{n.title}</span>
                      {!n.read_at && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">New</span>}
                    </div>
                    <p className="text-gray-400 text-sm">{n.message}</p>
                    <p className="text-gray-600 text-xs mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.read_at && (
                    <button onClick={() => markRead(n.id)} className="text-gray-500 hover:text-white text-xs shrink-0">✓ Mark read</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
export default withAdminPage(NotificationsPage);
