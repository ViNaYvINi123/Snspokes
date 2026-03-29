import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import axios from 'axios';

export default function AdminAnalytics() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/stats');
      setStats(res.data.stats);
    } catch (err) {
      if (err.response?.status === 401) router.push('/admin');
    } finally { setLoading(false); }
  };

  if (loading) return (
    <AdminLayout title="Search Analytics">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #1e1e2e', borderTopColor: '#6c63ff', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </AdminLayout>
  );

  const maxCount = Math.max(...(stats?.top_searches?.map(s => parseInt(s.count)) || [1]));

  return (
    <>
      <Head><title>Analytics — Admin snspokes</title></Head>
      <AdminLayout title="Search Analytics">

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '14px', border: '1px solid #1e1e2e' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#6c63ff', marginBottom: '4px' }}>{stats?.searches?.total?.toLocaleString() || 0}</div>
            <div style={{ fontSize: '13px', color: '#6b6b8a' }}>Total Searches</div>
          </div>
          <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '14px', border: '1px solid #1e1e2e' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>📅</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#4ade80', marginBottom: '4px' }}>{stats?.searches?.today || 0}</div>
            <div style={{ fontSize: '13px', color: '#6b6b8a' }}>Today's Searches</div>
          </div>
          <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '14px', border: '1px solid #1e1e2e' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>🏆</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', marginBottom: '4px' }}>{stats?.top_searches?.[0]?.query || '—'}</div>
            <div style={{ fontSize: '13px', color: '#6b6b8a' }}>Top Search Query</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* Top Searches Bar Chart */}
          <div style={{ padding: '24px', background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e' }}>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '24px' }}>🏆 Top Search Queries</h3>
            {stats?.top_searches?.length > 0 ? stats.top_searches.map((s, i) => {
              const pct = Math.round((parseInt(s.count) / maxCount) * 100);
              return (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#c4c4e0', fontSize: '13px', fontWeight: '500' }}>{s.query}</span>
                    <span style={{ color: '#6c63ff', fontSize: '13px', fontWeight: '700' }}>{s.count}</span>
                  </div>
                  <div style={{ height: '6px', background: '#1e1e2e', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, #6c63ff, #a855f7)`, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            }) : <p style={{ color: '#6b6b8a' }}>No search data yet</p>}
          </div>

          {/* Recent Searches */}
          <div style={{ padding: '24px', background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e' }}>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '24px' }}>🕐 Recent Searches</h3>
            {stats?.recent_searches?.length > 0 ? stats.recent_searches.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < stats.recent_searches.length - 1 ? '1px solid #1e1e2e' : 'none' }}>
                <div>
                  <span style={{ color: '#c4c4e0', fontSize: '13px', fontWeight: '500' }}>{s.query}</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: s.results > 0 ? '#4ade80' : '#f87171' }}>{s.results} results</span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#6b6b8a', whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleString()}</span>
              </div>
            )) : <p style={{ color: '#6b6b8a' }}>No searches yet</p>}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
