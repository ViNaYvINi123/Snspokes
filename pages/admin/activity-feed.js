import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

const TYPE_CONFIG = {
  signup:     { icon: '👤', color: '#60a5fa', label: 'New Signup' },
  search:     { icon: '🔍', color: '#a78bfa', label: 'Search' },
  payment:    { icon: '💳', color: '#4ade80', label: 'Payment' },
  error:      { icon: '⚠️',  color: '#f87171', label: 'Error' },
  codegen:    { icon: '💻', color: '#facc15', label: 'Code Generated' },
  submission: { icon: '📥', color: '#fb923c', label: 'Spoke Submitted' },
};

function ActivityFeedPage() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);
  const pausedRef = useRef(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

  useEffect(() => {
    const es = new EventSource('/api/admin/activity-feed?token=' + token);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'batch' && !pausedRef.current) {
          setEvents(prev => {
            const existing = new Set(prev.map(ev => ev.type + '-' + ev.created_at));
            const newOnes = (data.events || []).filter(ev => !existing.has(ev.type + '-' + ev.created_at));
            if (newOnes.length === 0) return prev;
            return [...newOnes, ...prev].slice(0, 200);
          });
        }
      } catch(err) {}
    };
    return () => { es.close(); setConnected(false); };
  }, [token]);

  function togglePause() {
    pausedRef.current = !pausedRef.current;
    setPaused(p => !p);
  }

  const filtered = events.filter(ev => {
    if (filter !== 'all' && ev.type !== filter) return false;
    if (search && !JSON.stringify(ev).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const FILTERS = ['all', 'signup', 'search', 'payment', 'error', 'codegen', 'submission'];

  return (
    <AdminLayout title="Live Activity Feed">
      <Head><title>Activity Feed | snspokes Admin</title></Head>
      <div style={{ padding: '24px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 }}>📡 Live Activity Feed</h1>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px',
              borderRadius: '20px', fontSize: '11px', fontWeight: '600',
              background: connected ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
              color: connected ? '#4ade80' : '#f87171'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#4ade80' : '#f87171' }} />
              {connected ? 'Live' : 'Disconnected'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..."
              style={{ background: '#111827', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '6px 12px', color: '#fff', fontSize: '12px', width: '180px', outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={togglePause}
              style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: paused ? '#16a34a' : 'rgba(202,138,4,0.15)', color: paused ? '#fff' : '#facc15' }}>
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button onClick={() => setEvents([])}
              style={{ background: '#111827', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
              🗑 Clear
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
          {FILTERS.map(f => {
            const cfg = TYPE_CONFIG[f];
            const count = f === 'all' ? events.length : events.filter(e => e.type === f).length;
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', transition: 'all 0.15s',
                  background: active ? '#6c63ff' : '#111827', color: active ? '#fff' : '#6b7280' }}>
                {cfg?.icon || '📋'} {f === 'all' ? 'All' : cfg?.label}
                <span style={{ padding: '1px 6px', borderRadius: '10px', fontSize: '10px',
                  background: active ? 'rgba(255,255,255,0.2)' : '#1e1e2e', color: active ? '#fff' : '#6b7280' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Events list */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#0a0a0f', borderRadius: '12px', border: '1px solid #1e1e2e', padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
          {paused && (
            <div style={{ position: 'sticky', top: 0, background: 'rgba(120,53,15,0.5)', color: '#fcd34d', textAlign: 'center', padding: '8px', borderRadius: '8px', marginBottom: '8px', fontSize: '11px' }}>
              ⏸ Feed paused
            </div>
          )}
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4b5563' }}>
              {connected ? 'Waiting for activity...' : 'Connecting to event stream...'}
            </div>
          ) : (
            filtered.map((ev, i) => {
              const cfg = TYPE_CONFIG[ev.type] || { icon: '📋', color: '#6b7280', label: ev.type };
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '6px 10px', borderRadius: '8px', marginBottom: '2px', borderLeft: '2px solid ' + cfg.color + '40' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '2px' }}>{cfg.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: cfg.color, fontWeight: '600' }}>{cfg.label}</span>
                      {ev.label && <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.label}</span>}
                      {ev.sublabel && <span style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.sublabel}</span>}
                      {ev.meta && <span style={{ color: cfg.color, opacity: 0.7 }}>[{ev.meta}]</span>}
                    </div>
                  </div>
                  <span style={{ color: '#4b5563', flexShrink: 0 }}>{new Date(ev.created_at).toLocaleTimeString()}</span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '8px', textAlign: 'right' }}>{filtered.length} events shown · Updates every 5s</p>
      </div>
    </AdminLayout>
  );
}

export default withAdminPage(ActivityFeedPage);
