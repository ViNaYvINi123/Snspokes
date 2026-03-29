import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import axios from 'axios';

export default function AdminPayments() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchPayments(); }, [page, statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/payments', { params: { page, limit: 20, status: statusFilter } });
      setPayments(res.data.payments);
      setSummary(res.data.summary);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      if (err.response?.status === 401) router.push('/admin');
    } finally { setLoading(false); }
  };

  const statusColors = { paid: '#4ade80', pending: '#fbbf24', failed: '#f87171', refunded: '#9999bb' };

  return (
    <>
      <Head><title>Payments — Admin snspokes</title></Head>
      <AdminLayout title="Payment Monitoring">

        {/* Summary Cards */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {[
              { label: 'Total Revenue', value: `₹${parseFloat(summary.total_revenue).toLocaleString()}`, color: '#4ade80', icon: '💰' },
              { label: 'Monthly Revenue', value: `₹${parseFloat(summary.monthly_revenue).toLocaleString()}`, color: '#6c63ff', icon: '📅' },
              { label: 'Paid', value: summary.paid_count, color: '#4ade80', icon: '✅' },
              { label: 'Pending', value: summary.pending_count, color: '#fbbf24', icon: '⏳' },
              { label: 'Failed', value: summary.failed_count, color: '#f87171', icon: '❌' },
            ].map(s => (
              <div key={s.label} style={{ padding: '20px', background: '#0f0f1a', borderRadius: '14px', border: '1px solid #1e1e2e' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>{s.icon}</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: s.color, marginBottom: '4px' }}>{s.value}</div>
                <div style={{ fontSize: '13px', color: '#6b6b8a' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '10px 16px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: 'Syne, sans-serif', outline: 'none' }}>
            <option value="">All Transactions</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <span style={{ color: '#6b6b8a', fontSize: '14px' }}>{total} transactions</span>
        </div>

        {/* Table */}
        <div style={{ background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e1e2e' }}>
                  {['User', 'Plan', 'Amount', 'Status', 'Payment ID', 'Date'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#6b6b8a', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#6b6b8a' }}>Loading...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#6b6b8a' }}>No payments found</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1e1e2e' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{p.user_name || 'Unknown'}</div>
                      <div style={{ color: '#6b6b8a', fontSize: '12px' }}>{p.user_email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '10px', fontSize: '12px', color: '#8b85ff', fontWeight: '600', textTransform: 'capitalize' }}>{p.plan_name || 'Unknown'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#fff', fontSize: '14px', fontWeight: '700' }}>₹{parseFloat(p.amount).toLocaleString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', background: `${statusColors[p.status]}15`, border: `1px solid ${statusColors[p.status]}33`, borderRadius: '10px', fontSize: '12px', color: statusColors[p.status] || '#6b6b8a', fontWeight: '600', textTransform: 'capitalize' }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6b6b8a', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>{p.razorpay_payment_id ? p.razorpay_payment_id.substring(0, 20) + '...' : '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#6b6b8a', fontSize: '12px' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid #1e1e2e' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '6px', color: page === 1 ? '#6b6b8a' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'Syne, sans-serif' }}>←</button>
              <span style={{ padding: '6px 12px', color: '#9999bb', fontSize: '13px' }}>Page {page} of {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={{ padding: '6px 12px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '6px', color: page === pages ? '#6b6b8a' : '#fff', cursor: page === pages ? 'default' : 'pointer', fontFamily: 'Syne, sans-serif' }}>→</button>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
