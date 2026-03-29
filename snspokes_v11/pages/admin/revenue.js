import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import axios from 'axios';

function StatCard({ label, value, sub, color = '#6c63ff', icon }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', letterSpacing: '-0.5px', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#6b7280' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

export default function AdminRevenue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/admin/revenue').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const mrr = data?.mrr || {};
  const trend = data?.monthly_trend || [];

  return (
    <>
      <Head><title>Revenue Dashboard — snspokes Admin</title></Head>
      <AdminLayout title="Revenue Dashboard" breadcrumbs={['Revenue']}>
        {loading ? <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Loading revenue data...</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
              <StatCard icon="💰" label="Monthly Recurring Revenue" value={`₹${(mrr.amount || 0).toLocaleString()}`} color="#10b981" />
              <StatCard icon="👥" label="Paying Customers" value={(mrr.pro_users || 0) + (mrr.team_users || 0)} sub={`${mrr.pro_users || 0} Pro · ${mrr.team_users || 0} Team`} color="#6c63ff" />
              <StatCard icon="📈" label="Conversion Rate" value={`${data?.conversion_rate || 0}%`} sub="Free → Paid (30 days)" color="#0ea5e9" />
              <StatCard icon="⚠️" label="Failed Payments" value={data?.failed_payments || 0} sub="Last 30 days" color="#ef4444" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {/* Plan distribution */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>Plan Distribution</h3></div>
                <div style={{ padding: '16px' }}>
                  {(data?.plan_distribution || []).map(p => {
                    const total = mrr.total_users || 1;
                    const pct = Math.round((p.count / total) * 100);
                    const colors = { free: '#9ca3af', pro: '#6c63ff', team: '#10b981' };
                    return (
                      <div key={p.plan} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                          <span style={{ fontWeight: '600', color: '#374151', textTransform: 'capitalize' }}>{p.plan}</span>
                          <span style={{ color: colors[p.plan] || '#6b7280' }}>{p.count} users ({pct}%)</span>
                        </div>
                        <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: colors[p.plan] || '#6c63ff', borderRadius: '3px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Revenue trend */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}><h3 style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>Monthly Revenue Trend</h3></div>
                <div style={{ padding: '16px' }}>
                  {trend.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>No revenue data yet</div>
                  ) : (
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <th style={{ padding: '6px 0', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Month</th>
                        <th style={{ padding: '6px 0', textAlign: 'right', fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Revenue</th>
                        <th style={{ padding: '6px 0', textAlign: 'right', fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Transactions</th>
                      </tr></thead>
                      <tbody>
                        {trend.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                            <td style={{ padding: '8px 0', color: '#374151' }}>{new Date(r.month).toLocaleDateString('en',{month:'short',year:'numeric'})}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>₹{parseFloat(r.revenue||0).toLocaleString()}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', color: '#6b7280' }}>{r.transactions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Export */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/api/admin/export?type=payments&format=csv" style={{ padding: '8px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>📥 Export Payments CSV</a>
              <a href="/api/admin/export?type=users&format=csv" style={{ padding: '8px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>📥 Export Users CSV</a>
            </div>
          </>
        )}
      </AdminLayout>
    </>
  );
}
