import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

const TYPE_CONFIG = {
  signup:     { icon: '👤', color: 'blue',   label: 'New Signup' },
  search:     { icon: '🔍', color: 'purple', label: 'Search' },
  payment:    { icon: '💳', color: 'green',  label: 'Payment' },
  error:      { icon: '⚠️', color: 'red',    label: 'Error' },
  codegen:    { icon: '💻', color: 'yellow', label: 'Code Generated' },
  submission: { icon: '📥', color: 'orange', label: 'Spoke Submitted' },
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
    const es = new EventSource(`/api/admin/activity-feed?token=${token}`);

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'batch' && !pausedRef.current) {
          setEvents(prev => {
            const existing = new Set(prev.map(ev => `${ev.type}-${ev.created_at}`));
            const newOnes = (data.events || []).filter(ev => !existing.has(`${ev.type}-${ev.created_at}`));
            if (newOnes.length === 0) return prev;
            return [...newOnes, ...prev].slice(0, 200); // keep last 200
          });
        }
      } catch {}
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

  return (
    <AdminLayout title="Live Activity Feed">
      <div className="p-6 h-[calc(100vh-80px)] flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">📡 Live Activity Feed</h1>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'Live' : 'Disconnected'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500 w-48" />
            <button onClick={togglePause}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${paused ? 'bg-green-600 text-white' : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40'}`}>
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button onClick={() => setEvents([])} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg text-xs">
              🗑 Clear
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {['all', 'signup', 'search', 'payment', 'error', 'codegen', 'submission'].map(f => {
            const cfg = TYPE_CONFIG[f];
            const count = f === 'all' ? events.length : events.filter(e => e.type === f).length;
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all
                  ${filter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {cfg?.icon || '📋'} {f === 'all' ? 'All' : cfg?.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === f ? 'bg-white/20' : 'bg-gray-700'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Events list */}
        <div className="flex-1 overflow-y-auto bg-gray-950 rounded-xl border border-gray-800 p-2 font-mono text-xs">
          {paused && (
            <div className="sticky top-0 bg-yellow-900/80 text-yellow-300 text-center py-2 rounded-lg mb-2 text-xs">
              ⏸ Feed paused — {events.length - filtered.length} new events waiting
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-600">
              {connected ? 'Waiting for activity...' : 'Connecting to event stream...'}
            </div>
          ) : (
            filtered.map((ev, i) => {
              const cfg = TYPE_CONFIG[ev.type] || { icon: '📋', color: 'gray', label: ev.type };
              return (
                <div key={i} className={`flex items-start gap-3 px-3 py-2 rounded-lg mb-1 hover:bg-gray-900/50 border-l-2 border-${cfg.color}-500/40`}>
                  <span className="text-base shrink-0 mt-0.5">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-${cfg.color}-400 font-semibold`}>{cfg.label}</span>
                      {ev.label && <span className="text-white truncate">{ev.label}</span>}
                      {ev.sublabel && <span className="text-gray-500 truncate">{ev.sublabel}</span>}
                      {ev.meta && <span className={`text-${cfg.color}-300/70`}>[{ev.meta}]</span>}
                    </div>
                  </div>
                  <span className="text-gray-600 shrink-0">{new Date(ev.created_at).toLocaleTimeString()}</span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <p className="text-gray-600 text-xs mt-2 text-right">{filtered.length} events shown · Updates every 5s</p>
      </div>
    </AdminLayout>
  );
}

export default withAdminPage(ActivityFeedPage);
