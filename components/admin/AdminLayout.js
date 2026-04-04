import QuickActionsWidget from './QuickActionsWidget';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';

const Icon = {
  Dashboard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Payments: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Analytics: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Spokes: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="5" x2="12" y2="3"/><line x1="17" y1="7" x2="19" y2="5"/><line x1="19" y1="12" x2="21" y2="12"/><line x1="17" y1="17" x2="19" y2="19"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="7" y1="17" x2="5" y2="19"/><line x1="5" y1="12" x2="3" y2="12"/><line x1="7" y1="7" x2="5" y2="5"/></svg>,
  Properties: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Database: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Logs: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41M2 12h2m16 0h2M20 5l-1.5 1.5M6.5 17.5L5 19M12 2v2m0 16v2m7.07 1.07l-1.41-1.41M6.34 6.34L4.93 4.93"/></svg>,
  Logout: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Globe: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  ChevronRight: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Menu: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
};

const NAV_GROUPS = [
  { label: 'Overview', items: [
    { href: '/admin/dashboard',      label: '📊 Dashboard' },
    { href: '/admin/activity-feed',  label: '📡 Live Feed' },
    { href: '/admin/system',         label: '🖥️ System Health' },
  ]},
  { label: 'Users', items: [
    { href: '/admin/users',          label: '👥 Users' },
    { href: '/admin/user-detail',    label: '🔍 User Detail' },
    { href: '/admin/teams',          label: '👥 Teams' },
    { href: '/admin/broadcast',      label: '📨 Broadcast' },
  ]},
  { label: 'Content', items: [
    { href: '/admin/spokes',         label: '🔌 Spokes' },
    { href: '/admin/submissions',    label: '📥 Submissions' },
    { href: '/admin/ratings',        label: '⭐ Ratings' },
    { href: '/admin/chatbot-logs',   label: '🤖 Chatbot Logs' },
    { href: '/admin/changelog',      label: '📋 Changelog' },
  ]},
  { label: 'Revenue', items: [
    { href: '/admin/analytics',      label: '📈 Analytics' },
    { href: '/admin/payments',       label: '💳 Payments' },
    { href: '/admin/revenue',        label: '💰 Revenue' },
    { href: '/admin/plans',          label: '📦 Plans' },
    { href: '/admin/promo-codes',    label: '🎟️ Promo Codes' },
  ]},
  { label: 'System', items: [
    { href: '/admin/logs',           label: '📋 Logs' },
    { href: '/admin/audit-log',      label: '🔐 Audit Log' },
    { href: '/admin/backup',         label: '💾 Backup' },
    { href: '/admin/database',       label: '🗄️ Database' },
    { href: '/admin/ip-block',       label: '🛡️ IP Block' },
    { href: '/admin/export',         label: '📤 Export' },
  ]},
  { label: 'Config', items: [
    { href: '/admin/properties',     label: '⚙️ Properties' },
    { href: '/admin/flags',          label: '🚩 Feature Flags' },
    { href: '/admin/announcements',  label: '📢 Announcements' },
    { href: '/admin/notifications',  label: '🔔 Notifications' },
    { href: '/admin/webhooks',       label: '🔗 Webhooks' },
    { href: '/admin/footer',         label: '🦶 Footer' },
    { href: '/admin/settings',       label: '⚙️ Settings' },
  ]},
  { label: 'AI Tools', items: [
    { href: '/admin/ai-debug',       label: '🤖 AI Debug' },
    { href: '/admin/api-connectors', label: '🔌 Connectors' },
  ]},
];

// Global axios interceptors
if (typeof window !== 'undefined') {
  axios.interceptors.request.use(config => {
    const token = localStorage.getItem('admin_token');
    if (token && config.url && config.url.includes('/api/admin')) {
      config.headers['x-admin-token'] = token;
      config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
  });

  // Handle 401 — clear bad token and redirect to login
  axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401 && typeof window !== 'undefined') {
        const url = error.config && error.config.url;
        if (url && url.includes('/api/admin') && !url.includes('/api/admin/login')) {
          localStorage.removeItem('admin_token');
          if (window.location.pathname !== '/admin') {
            window.location.href = '/admin';
          }
        }
      }
      return Promise.reject(error);
    }
  );
}

export function useAdminAuth() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin');
      return;
    }
    // Validate token with a lightweight API call
    fetch('/api/admin/system', { headers: { 'x-admin-token': token } })
      .then(r => {
        if (r.ok) setChecked(true);
        else { localStorage.removeItem('admin_token'); router.replace('/admin'); }
      })
      .catch(() => { localStorage.removeItem('admin_token'); router.replace('/admin'); });
  }, []);
  return checked;
}

function NavItem({ item, active, collapsed }) {
  const IconComp = Icon[item.icon];
  const [hover, setHover] = useState(false);
  return (
    <Link href={item.href} title={collapsed ? item.label : ''} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: collapsed ? '9px' : '8px 10px',
      borderRadius: '8px', textDecoration: 'none',
      color: active ? '#6c63ff' : hover ? '#e2e8f0' : '#6b7280',
      background: active ? '#1a1a2e' : hover ? '#111827' : 'transparent',
      fontSize: '14px', fontWeight: active ? '600' : '400',
      transition: 'all 0.12s ease',
      justifyContent: collapsed ? 'center' : 'flex-start',
      position: 'relative', marginBottom: '2px',
    }}
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
    >
      {active && !collapsed && <div style={{ position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)', width: '3px', height: '18px', background: '#6c63ff', borderRadius: '0 2px 2px 0' }} />}
      <span style={{ color: active ? '#6c63ff' : hover ? '#e2e8f0' : '#9ca3af', flexShrink: 0, display: 'flex' }}>
        {IconComp && <IconComp />}
      </span>
      {!collapsed && item.label}
    </Link>
  );
}


function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await axios.get('/api/admin/notifications?unread=true');
        setCount(res.data.unread_count || 0);
        setNotifs(res.data.notifications || []);
      } catch {}
    };
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, []);

  const markRead = async () => {
    await axios.patch('/api/admin/notifications').catch(() => {});
    setCount(0);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(o => !o); if (!open && count > 0) markRead(); }}
        style={{ position: 'relative', background: 'none', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {count > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: '#ef4444', borderRadius: '50%', fontSize: '10px', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '36px', width: '320px', background: '#111827', border: '1px solid #1e1e2e', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>Notifications</span>
            <button onClick={() => { axios.delete('/api/admin/notifications').catch(()=>{}); setNotifs([]); }} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#9ca3af', cursor: 'pointer' }}>Clear all</button>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {notifs.length === 0 ? <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No notifications</div>
              : notifs.slice(0, 10).map(n => (
                <div key={n.id} style={{ padding: '10px 14px', borderBottom: '1px solid #1e1e2e', background: n.read ? 'transparent' : '#111827' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '14px' }}>{n.type === 'error' ? '🔴' : n.type === 'warning' ? '🟡' : n.type === 'success' ? '🟢' : '🔵'}</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0' }}>{n.title}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{n.message?.substring(0, 60)}</div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
          <div style={{ padding: '8px 14px', borderTop: '1px solid #1e1e2e' }}>
            <a href="/admin/logs" style={{ fontSize: '12px', color: '#6c63ff', textDecoration: 'none' }}>View all logs →</a>
          </div>
        </div>
      )}
      <QuickActionsWidget />
</div>
  );
}

export default function AdminLayout({ children, title, breadcrumbs = [] }) {
  const router = useRouter();
  const isAuth = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    localStorage.removeItem('admin_token');
    await axios.post('/api/admin/logout').catch(() => {});
    router.push('/admin');
  };

  if (!isAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #1e1e2e', borderTopColor: '#6c63ff', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const sidebarW = collapsed ? '60px' : '232px';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0a0a0f; color: #e2e8f0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        input, select, textarea, button { font-family: inherit; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: sidebarW, minHeight: '100vh', background: '#0d0d1a',
        borderRight: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        transition: 'width 0.2s ease', overflowX: 'hidden', overflowY: 'auto',
      }}>
        {/* Logo area */}
        <div style={{ padding: '0 12px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e1e2e', flexShrink: 0 }}>
          {!collapsed ? (
            <>
              <Link href="/" target="_blank" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px' }}>
                <img src="/logo.svg" alt="snspokes" width="26" height="26" style={{ borderRadius: '6px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>snspokes<span style={{ color:'#6c63ff' }}>.com</span></div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>Admin Console</div>
                </div>
              </Link>
              <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px', borderRadius: '4px', display: 'flex', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background='#1a1a2e'; e.currentTarget.style.color='#e2e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#9ca3af'; }}
              ><Icon.Menu /></button>
            </>
          ) : (
            <button onClick={() => setCollapsed(false)} style={{ margin: '0 auto', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
              <img src="/logo.svg" alt="S" width="26" height="26" style={{ borderRadius: '6px' }} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: '8px' }}>
              {!collapsed && (
                <div style={{ fontSize: '10px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '8px 10px 4px', whiteSpace: 'nowrap' }}>
                  {group.label}
                </div>
              )}
              {collapsed && <div style={{ height: '8px' }} />}
              {group.items.map(item => (
                <NavItem key={item.href} item={item} active={router.pathname === item.href} collapsed={collapsed} />
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '8px', borderTop: '1px solid #1e1e2e', flexShrink: 0 }}>
          <Link href="/" target="_blank" title={collapsed ? 'View Site' : ''} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: collapsed ? '9px' : '8px 10px', borderRadius: '8px', textDecoration: 'none', color: '#6b7280', fontSize: '14px', marginBottom: '2px', justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background='#1a1a2e'; e.currentTarget.style.color='#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#6b7280'; }}
          >
            <span style={{ color: '#9ca3af', display: 'flex', flexShrink: 0 }}><Icon.Globe /></span>
            {!collapsed && 'View Site'}
          </Link>
          <button onClick={handleLogout} disabled={loggingOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: collapsed ? '9px' : '8px 10px', borderRadius: '8px', background: 'none', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          >
            <span style={{ display: 'flex', flexShrink: 0 }}><Icon.Logout /></span>
            {!collapsed && (loggingOut ? 'Logging out...' : 'Log out')}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, marginLeft: sidebarW, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.2s ease', minWidth: 0 }}>

        {/* Top Bar */}
        <header style={{ height: '60px', background: '#0d0d1a', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 40 }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>Admin</span>
            <span style={{ color: '#d1d5db', display: 'flex' }}><Icon.ChevronRight /></span>
            {breadcrumbs.map((b, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: i === breadcrumbs.length - 1 ? '#e2e8f0' : '#6b7280', fontWeight: i === breadcrumbs.length - 1 ? '600' : '400' }}>{b}</span>
                {i < breadcrumbs.length - 1 && <span style={{ color: '#d1d5db', display: 'flex' }}><Icon.ChevronRight /></span>}
              </span>
            ))}
            {breadcrumbs.length === 0 && <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600' }}>{title}</span>}
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>Live</span>
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>A</div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '28px 24px', overflowY: 'auto', animation: 'fadeIn 0.2s ease' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', margin: '0 0 20px', letterSpacing: '-0.3px' }}>{title}</h1>
          {children}
        </main>
      </div>
      <QuickActionsWidget />
</div>
  );
}
