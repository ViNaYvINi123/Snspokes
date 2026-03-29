import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import Link from 'next/link';

function CommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toast, setToast] = useState(null);
  const [maintenance, setMaintenance] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/command-center', { headers: { 'x-admin-token': token } });
      const d = await r.json();
      if (d.success) { setData(d); setLastRefresh(new Date()); }
    } catch {}
    setLoading(false);
  }, [token]);

  const checkMaintenance = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/quick-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ action: 'get_maintenance_status' }),
      });
      const d = await r.json();
      if (d.success) setMaintenance(d.maintenance);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchData();
    checkMaintenance();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData, checkMaintenance]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function quickAction(action, params = {}, confirmMsg = null) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActionLoading(action);
    try {
      const r = await fetch('/api/admin/quick-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ action, params }),
      });
      const d = await r.json();
      if (d.success) { showToast(d.message); fetchData(); }
      else showToast(d.error || 'Action failed', 'error');
    } catch { showToast('Action failed', 'error'); }
    setActionLoading(null);
  }

  async function toggleMaintenance() {
    await quickAction('maintenance_mode', { enabled: !maintenance }, maintenance ? 'Turn OFF maintenance mode?' : '⚠️ Turn ON maintenance mode? Users will see a maintenance page.');
    setMaintenance(m => !m);
  }

  const stats = data?.stats || {};

  const statCards = [
    { label: 'Total Users',       value: stats.total_users,         sub: `+${stats.new_users_today} today`,  icon: '👥', color: 'blue',   href: '/admin/users' },
    { label: 'Revenue (MRR)',     value: `₹${stats.total_revenue}`, sub: `${stats.active_subs} active subs`, icon: '💰', color: 'green',  href: '/admin/revenue' },
    { label: 'Searches Today',    value: stats.searches_today,      sub: 'last 24 hours',                     icon: '🔍', color: 'purple', href: '/admin/analytics' },
    { label: 'Code Generated',    value: stats.code_gens_today,     sub: 'today',                             icon: '💻', color: 'yellow', href: '/admin/analytics' },
    { label: 'Open Errors',       value: stats.open_errors,         sub: stats.open_errors > 0 ? '⚠️ needs attention' : '✅ all clear', icon: '⚠️', color: stats.open_errors > 0 ? 'red' : 'green', href: '/admin/logs' },
    { label: 'Pending Submissions',value: stats.pending_submissions, sub: 'awaiting review',                  icon: '📥', color: 'orange', href: '/admin/submissions' },
    { label: 'DB Size',           value: stats.db_size,             sub: 'PostgreSQL',                        icon: '🗄️', color: 'gray',   href: '/admin/database' },
    { label: 'Active Subs',       value: stats.active_subs,         sub: 'paying customers',                  icon: '💳', color: 'pink',   href: '/admin/payments' },
  ];

  const planColors = { free: 'gray', pro: 'purple', enterprise: 'yellow' };
  const typeIcons = { signup: '👤', search: '🔍', payment: '💳', error: '⚠️', codegen: '💻', submission: '📥' };
  const typeColors = { signup: 'blue', search: 'purple', payment: 'green', error: 'red', codegen: 'yellow', submission: 'orange' };

  return (
    <AdminLayout title="Command Center">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl transition-all
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {toast.msg}
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🎯 Command Center</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : 'Loading...'} · Auto-refreshes every 30s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">
              🔄 Refresh
            </button>
            <button onClick={toggleMaintenance}
              style={{ padding:'8px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', transition:'all 0.15s', border:'none', cursor:'pointer', fontFamily:'inherit', background: maintenance ? '#dc2626' : '#111827', color: maintenance ? '#fff' : '#d1d5db' }}>
              {maintenance ? '🚨 Maintenance ON' : '🟢 Site Live'}
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(s => (
              <Link key={s.label} href={s.href}>
                <div style={{ background:"#111827", border:"1px solid " + (s.color || "#6b7280") + "33", borderRadius:"12px", padding:"20px", cursor:"pointer", transition:"all 0.15s" }}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-gray-600 group-hover:text-gray-400 text-xs">→</span>
                  </div>
                  <div style={{ fontSize:"24px", fontWeight:"700", color: s.color || "#9999bb" }}>{s.value ?? '—'}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{s.label}</div>
                  <div className="text-gray-600 text-xs mt-0.5">{s.sub}</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-bold text-white mb-4">⚡ Quick Actions</h2>
            <div className="space-y-2">
              {[
                { action: 'clear_cache',        label: '🗑️ Clear Cache',          confirm: null },
                { action: 'resolve_all_errors', label: '✅ Resolve All Errors',   confirm: 'Resolve all open errors?' },
                { action: 'trigger_backup',     label: '💾 Trigger Backup',       confirm: 'Start a backup now?' },
              ].map(a => (
                <button key={a.action}
                  onClick={() => quickAction(a.action, {}, a.confirm)}
                  disabled={actionLoading === a.action}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-all disabled:opacity-50">
                  <span>{a.label}</span>
                  {actionLoading === a.action && <span className="text-xs text-gray-400">Running...</span>}
                </button>
              ))}

              {/* Pending submissions quick approve */}
              {stats.pending_submissions > 0 && (
                <Link href="/admin/submissions"
                  className="w-full flex items-center justify-between px-4 py-3 bg-orange-900/30 hover:bg-orange-900/50 border border-orange-500/30 rounded-lg text-sm text-orange-300 transition-all">
                  <span>📥 Review {stats.pending_submissions} Pending Spoke{stats.pending_submissions > 1 ? 's' : ''}</span>
                  <span>→</span>
                </Link>
              )}

              {stats.open_errors > 0 && (
                <Link href="/admin/logs"
                  className="w-full flex items-center justify-between px-4 py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all">
                  <span>⚠️ {stats.open_errors} Open Error{stats.open_errors > 1 ? 's' : ''}</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-bold text-white mb-4">📊 Plan Distribution</h2>
            <div className="space-y-3">
              {(data?.plan_distribution || []).map(p => {
                const total = data?.plan_distribution?.reduce((s, x) => s + parseInt(x.count), 0) || 1;
                const pct = Math.round((parseInt(p.count) / total) * 100);
                const c = planColors[p.plan] || 'gray';
                return (
                  <div key={p.plan}>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span className="capitalize font-medium text-white">{p.plan}</span>
                      <span>{p.count} users ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div style={{ background: c || "#6b7280", height:"8px", borderRadius:"9999px" }} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {!data?.plan_distribution?.length && <p className="text-gray-500 text-sm">No data yet</p>}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <h3 className="text-xs font-medium text-gray-400 mb-2">Top Searches (7 days)</h3>
              {(data?.top_searches || []).map(s => (
                <div key={s.query} className="flex justify-between text-xs py-1">
                  <span className="text-gray-300 truncate">{s.query}</span>
                  <span className="text-purple-400 ml-2 shrink-0">{s.count}x</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white">👥 Recent Signups</h2>
              <Link href="/admin/users" className="text-xs text-purple-400 hover:text-purple-300">View all →</Link>
            </div>
            <div className="space-y-3">
              {(data?.recent_users || []).map(u => (
                <div key={u.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-purple-900/40 rounded-full flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                      {(u.name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-xs font-medium truncate">{u.name || '—'}</div>
                      <div className="text-gray-500 text-xs truncate">{u.email}</div>
                    </div>
                  </div>
                  <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'4px', flexShrink:0, background:(planColors[u.plan] || '#6b7280') + '15', color: planColors[u.plan] || '#6b7280' }}>
                    {u.plan}
                  </span>
                </div>
              ))}
              {!data?.recent_users?.length && <p className="text-gray-500 text-sm">No users yet</p>}
            </div>
          </div>
        </div>

        {/* Recent Errors */}
        {data?.recent_errors?.length > 0 && (
          <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white">⚠️ Recent Errors</h2>
              <div className="flex gap-2">
                <button onClick={() => quickAction('resolve_all_errors', {}, 'Resolve all errors?')}
                  className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600/40 px-3 py-1.5 rounded-lg">
                  Resolve All
                </button>
                <Link href="/admin/logs" className="text-xs text-red-400 hover:text-red-300">View logs →</Link>
              </div>
            </div>
            <div className="space-y-2">
              {data.recent_errors.map((e, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-900/50 rounded-lg px-4 py-3">
                  <span className="text-red-400 text-xs mt-0.5 shrink-0">[{e.source || 'system'}]</span>
                  <p className="text-gray-300 text-xs truncate flex-1">{e.message}</p>
                  <span className="text-gray-600 text-xs shrink-0">{new Date(e.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(CommandCenter);
