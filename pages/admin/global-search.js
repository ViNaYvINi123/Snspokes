import { useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

const TYPE_CONFIG = {
  user: { icon: '👤', color: '#6c63ff', href: '/admin/users' },
  spoke: { icon: '🔌', color: '#f59e0b', href: '/admin/spokes' },
  property: { icon: '⚙️', color: '#0ea5e9', href: '/admin/properties' },
  flag: { icon: '🚩', color: '#10b981', href: '/admin/flags' },
  log: { icon: '📋', color: '#8b5cf6', href: '/admin/logs' },
  error: { icon: '🔴', color: '#ef4444', href: '/admin/logs' },
};

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('all');
  const timer = useRef(null);

  const search = async (q, t = type) => {
    if (!q || q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/global-search', { params: { q: q.trim(), type: t } });
      setResults(res.data);
    } catch { setResults(null); }
    finally { setLoading(false); }
  };

  const handleInput = (val) => {
    setQuery(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(val), 400);
  };

  const allResults = results?.results || [];
  const flat = Array.isArray(allResults) ? allResults : Object.values(allResults).flat();

  return (
    <>
      <Head><title>Global Search — snspokes Admin</title></Head>
      <AdminLayout title="Global Search" breadcrumbs={['Global Search']}>

        {/* Big search input */}
        <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: '10px', marginBottom: '14px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={query} onChange={e => handleInput(e.target.value)} placeholder="Search across users, spokes, properties, logs, flags..." autoFocus
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '16px', fontFamily: 'inherit', background: 'transparent', color: '#e2e8f0' }} />
            {loading && <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #1e1e2e', borderTopColor: '#6c63ff', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />}
            {query && <button onClick={() => { setQuery(''); setResults(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px' }}>×</button>}
          </div>

          {/* Type filters */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['all', 'All'], ['users', 'Users'], ['spokes', 'Spokes'], ['properties', 'Properties'], ['flags', 'Flags'], ['logs', 'Logs'], ['errors', 'Errors']].map(([val, label]) => (
              <button key={val} onClick={() => { setType(val); search(query, val); }}
                style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '500', transition: 'all 0.12s', background: type === val ? '#6c63ff' : '#0d0d1a', borderColor: type === val ? '#6c63ff' : '#1e1e2e', color: type === val ? '#fff' : '#6b7280' }}>
                {label}
                {results?.counts?.[val.replace('users','user').replace('spokes','spoke').replace('properties','propert').replace('flags','flag').replace('logs','log').replace('errors','error')] > 0 && (
                  <span style={{ marginLeft: '4px', background: 'rgba(255,255,255,0.2)', padding: '0 5px', borderRadius: '10px', fontSize: '10px' }}>
                    {results.counts[val]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {!query && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
            <p style={{ fontSize: '15px', color: '#9999bb', fontWeight: '500', marginBottom: '6px' }}>Search everything in one place</p>
            <p style={{ fontSize: '13px' }}>Users, spokes, properties, feature flags, logs, errors</p>
          </div>
        )}

        {query && results && flat.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
            <p style={{ fontSize: '15px', color: '#9999bb', fontWeight: '500', marginBottom: '6px' }}>No results for "{query}"</p>
            <p style={{ fontSize: '13px' }}>Try different keywords or change the filter</p>
          </div>
        )}

        {flat.length > 0 && (
          <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2e' }}>
              <p style={{ fontSize: '12px', color: '#6b6b8a' }}>{flat.length} results for "<strong style={{ color: '#e2e8f0' }}>{query}</strong>"</p>
            </div>
            {flat.map((item, i) => {
              const cfg = TYPE_CONFIG[item.type] || { icon: '📄', color: '#6b6b8a', href: '/admin/dashboard' };
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderBottom: i < flat.length - 1 ? '1px solid #1e1e2e' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0d0d1a'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                      <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`, fontWeight: '600', flexShrink: 0 }}>{item.type}</span>
                    </div>
                    {item.subtitle && <p style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subtitle}</p>}
                  </div>
                  <div style={{ display: 'flex', align: 'center', gap: '8px', flexShrink: 0 }}>
                    {item.created_at && <span style={{ fontSize: '11px', color: '#9ca3af' }}>{new Date(item.created_at).toLocaleDateString()}</span>}
                    <Link href={cfg.href} style={{ padding: '4px 10px', background: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: '6px', fontSize: '12px', color: '#9999bb', textDecoration: 'none' }}>View →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    </>
  );
}


export default withAdminPage(GlobalSearch);

export const getServerSideProps = async () => ({ props: {} });
