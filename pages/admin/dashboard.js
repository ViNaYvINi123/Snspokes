import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

// Reusable Medusa-style stat card
function StatCard({ label, value, sub, icon, trend, color = '#6c63ff' }) {
  return (
    <div style={{ background: '#0f0f1a', borderRadius: '12px', border: '1px solid #1e1e2e', padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', background: trend >= 0 ? '#052e16' : '#2d0a0a', color: trend >= 0 ? '#16a34a' : '#dc2626', fontWeight: '600', border: `1px solid ${trend >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: '26px', fontWeight: '700', color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function StatusPill({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', background: ok ? '#052e16' : '#2d0a0a', border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px' }}>
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: ok ? '#22c55e' : '#ef4444' }} />
      <span style={{ fontSize: '12px', fontWeight: '600', color: ok ? '#15803d' : '#dc2626' }}>{label}</span>
    </div>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div style={{ background: '#0f0f1a', borderRadius: '12px', border: '1px solid #1e1e2e', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>{title}</h3>
        {action}
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/admin/system');
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      if (err.response?.status === 401) window.location.href = '/admin';
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, []);

  const m = data?.metrics || {};
  const redis = data?.redis || {};
  const queue = data?.queue;

  return (
    <>
      <Head><title>Dashboard — snspokes Admin</title></Head>
      <AdminLayout title="Dashboard" breadcrumbs={['Dashboard']}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#6c63ff', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#6b7280', fontSize: '14px' }}>Loading dashboard...</span>
          </div>
        ) : (
          <>
            {/* System Status */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <StatusPill ok={true} label="App Server" />
                <StatusPill ok={redis.connected} label="Redis Cache" />
                <StatusPill ok={!!queue} label="Job Queue" />
                <StatusPill ok={true} label="Database" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {lastUpdated && <span style={{ fontSize: '12px', color: '#9ca3af' }}>Updated {lastUpdated.toLocaleTimeString()}</span>}
                <button onClick={fetchData} style={{ padding: '6px 14px', background: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: '8px', color: '#9999bb', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#111122'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0d0d1a'}
                >↻ Refresh</button>
              </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <StatCard icon="👥" label="Total Users" value={m.users?.toLocaleString() || '0'} color="#6c63ff" />
              <StatCard icon="🔍" label="Total Searches" value={m.searches_total?.toLocaleString() || '0'} sub={`${m.searches_today || 0} today`} color="#0ea5e9" />
              <StatCard icon="🔌" label="Total Spokes" value={m.spokes || '0'} color="#f59e0b" />
              <StatCard icon="💰" label="Revenue" value={`₹${parseFloat(m.revenue || 0).toLocaleString()}`} color="#10b981" />
            </div>

            {/* Two column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

              {/* Redis */}
              <SectionCard title="Redis Cache">
                {redis.connected ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { label: 'Cache Keys', val: redis.keys?.toLocaleString() || 0 },
                      { label: 'Hit Rate', val: redis.hit_rate || 'N/A' },
                      { label: 'Hits', val: redis.hits?.toLocaleString() || 0 },
                      { label: 'Misses', val: redis.misses?.toLocaleString() || 0 },
                    ].map(s => (
                      <div key={s.label} style={{ padding: '12px', background: '#0d0d1a', borderRadius: '8px', border: '1px solid #1e1e2e' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0' }}>{s.val}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📴</div>
                    <p style={{ fontSize: '13px', margin: 0 }}>Redis not connected — add REDIS_HOST to .env.local</p>
                  </div>
                )}
              </SectionCard>

              {/* Queue */}
              <SectionCard title="Job Queue">
                {queue ? (
                  <div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search Pipeline</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {[
                        { label: 'Waiting', val: queue.search?.waiting || 0, color: '#f59e0b' },
                        { label: 'Active', val: queue.search?.active || 0, color: '#6c63ff' },
                        { label: 'Done', val: queue.search?.completed || 0, color: '#10b981' },
                        { label: 'Failed', val: queue.search?.failed || 0, color: '#ef4444' },
                      ].map(s => (
                        <div key={s.label} style={{ padding: '10px 8px', background: '#0d0d1a', borderRadius: '8px', textAlign: 'center', border: '1px solid #1e1e2e' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: s.color }}>{s.val}</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
                    <p style={{ fontSize: '13px', margin: 0 }}>Queue offline — requires Redis</p>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Trending + Recent */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <SectionCard title="🔥 Trending Queries">
                {(data?.trending || []).length > 0 ? (data.trending || []).map((t, i) => {
                  const max = data.trending[0]?.count || 1;
                  const pct = Math.round((t.count / max) * 100);
                  return (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#9999bb', fontWeight: '500' }}>{t.query}</span>
                        <span style={{ fontSize: '12px', color: '#6c63ff', fontWeight: '600' }}>{t.count}</span>
                      </div>
                      <div style={{ height: '4px', background: '#111122', borderRadius: '2px' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6c63ff, #a855f7)', borderRadius: '2px', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
                }) : <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No trending data yet</p>}
              </SectionCard>

              <SectionCard title="🕐 Recent Searches">
                {(data?.recent_queries || []).length > 0
                  ? (data.recent_queries || []).slice(0, 8).map((q, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 7 ? '1px solid #1e1e2e' : 'none' }}>
                      <span style={{ fontSize: '13px', color: '#9999bb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{q.query}</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0, marginLeft: '8px' }}>{new Date(q.ts).toLocaleTimeString()}</span>
                    </div>
                  ))
                  : <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No live data yet</p>
                }
              </SectionCard>
            </div>

            {/* Quick Actions */}
            <SectionCard title="Quick Actions">
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Manage Users', href: '/admin/users', color: '#6c63ff' },
                  { label: 'View Payments', href: '/admin/payments', color: '#10b981' },
                  { label: 'Analytics', href: '/admin/analytics', color: '#0ea5e9' },
                  { label: 'Manage Spokes', href: '/admin/spokes', color: '#f59e0b' },
                  { label: 'SN Properties', href: '/admin/properties', color: '#8b5cf6' },
                  { label: 'Database', href: '/admin/database', color: '#06b6d4' },
                  { label: 'Activity Logs', href: '/admin/logs', color: '#ec4899' },
                  { label: 'Settings', href: '/admin/settings', color: '#f97316' },
                ].map(a => (
                  <a key={a.href} href={a.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: `${a.color}10`, border: `1px solid ${a.color}30`, borderRadius: '8px', color: a.color, textDecoration: 'none', fontSize: '13px', fontWeight: '600', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = `${a.color}20`}
                    onMouseLeave={e => e.currentTarget.style.background = `${a.color}10`}
                  >{a.label} →</a>
                ))}
              </div>
            </SectionCard>
          </>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(AdminDashboard);
