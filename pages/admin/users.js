import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState('pro');

  useEffect(() => { fetchUsers(); }, [page, planFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/users', { params: { page, limit: 20, search, plan: planFilter } });
      setUsers(res.data.users);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      if (err.response?.status === 401) router.push('/admin');
    } finally { setLoading(false); }
  };

  const handleBan = async () => {
    setActionLoading(selectedUser.id);
    try {
      await axios.patch('/api/admin/users', { id: selectedUser.id, action: 'ban', reason: banReason });
      setShowBanModal(false); setBanReason('');
      fetchUsers();
    } catch (err) { setErrMsg('Failed to ban user'); }
    finally { setActionLoading(null); }
  };

  const handleUnban = async (user) => {
    setActionLoading(user.id);
    try {
      await axios.patch('/api/admin/users', { id: user.id, action: 'unban' });
      fetchUsers();
    } catch(e) { setErrMsg('Failed to unban user'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
    setActionLoading(user.id);
    try {
      await axios.delete('/api/admin/users', { data: { id: user.id } });
      fetchUsers();
    } catch(e) { setErrMsg('Failed to delete user'); }
    finally { setActionLoading(null); }
  };

  const handleUpgrade = async () => {
    setActionLoading(selectedUser.id);
    try {
      await axios.patch('/api/admin/users', { id: selectedUser.id, action: 'upgrade', plan: upgradePlan });
      setShowUpgradeModal(false);
      fetchUsers();
    } catch(e) { setErrMsg('Failed to upgrade user'); }
    finally { setActionLoading(null); }
  };

  const planColors = { free: '#6b6b8a', pro: '#6c63ff', team: '#a855f7' };

  return (
    <>
      <Head><title>Users — Admin snspokes</title></Head>
      <AdminLayout title="User Management">

        {/* Header */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsers()}
              style={{ flex: 1, minWidth: '200px', padding: '10px 16px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: 'Syne, sans-serif', outline: 'none' }} />
            <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
              style={{ padding: '10px 16px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: 'Syne, sans-serif', outline: 'none' }}>
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </select>
            <button onClick={fetchUsers} style={{ padding: '10px 20px', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: '10px', color: '#8b85ff', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '14px' }}>Search</button>
          </div>
          <span style={{ color: '#6b6b8a', fontSize: '14px' }}>{total} total users</span>
        </div>

        {/* Table */}
        <div style={{ background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e1e2e' }}>
                  {['User', 'Plan', 'Provider', 'Searches', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#6b6b8a', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#6b6b8a' }}>Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#6b6b8a' }}>No users found</td></tr>
                ) : users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #1e1e2e', opacity: user.is_banned ? 0.6 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{user.name?.[0]?.toUpperCase()}</div>
                        <div>
                          <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{user.name}</div>
                          <div style={{ color: '#6b6b8a', fontSize: '12px' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', background: `${planColors[user.plan]}22`, border: `1px solid ${planColors[user.plan]}44`, borderRadius: '10px', fontSize: '12px', color: planColors[user.plan] || '#6b6b8a', fontWeight: '600', textTransform: 'capitalize' }}>{user.plan || 'free'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#9999bb', fontSize: '13px' }}>{user.provider}</td>
                    <td style={{ padding: '14px 16px', color: '#9999bb', fontSize: '13px' }}>{user.search_count || 0}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', background: user.is_banned ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', border: `1px solid ${user.is_banned ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.3)'}`, borderRadius: '10px', fontSize: '12px', color: user.is_banned ? '#f87171' : '#4ade80', fontWeight: '600' }}>
                        {user.is_banned ? '🚫 Banned' : '✅ Active'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6b6b8a', fontSize: '12px' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setSelectedUser(user); setShowUpgradeModal(true); }} disabled={actionLoading === user.id}
                          style={{ padding: '5px 10px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '6px', color: '#8b85ff', fontSize: '11px', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                          ⬆️ Plan
                        </button>
                        {user.is_banned ? (
                          <button onClick={() => handleUnban(user)} disabled={actionLoading === user.id}
                            style={{ padding: '5px 10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '6px', color: '#4ade80', fontSize: '11px', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                            ✅ Unban
                          </button>
                        ) : (
                          <button onClick={() => { setSelectedUser(user); setShowBanModal(true); }} disabled={actionLoading === user.id}
                            style={{ padding: '5px 10px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '6px', color: '#fbbf24', fontSize: '11px', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                            🚫 Ban
                          </button>
                        )}
                        <button onClick={() => handleDelete(user)} disabled={actionLoading === user.id}
                          style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', fontSize: '11px', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid #1e1e2e' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '6px', color: page === 1 ? '#6b6b8a' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'Syne, sans-serif' }}>←</button>
              <span style={{ padding: '6px 12px', color: '#9999bb', fontSize: '13px' }}>Page {page} of {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={{ padding: '6px 12px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '6px', color: page === pages ? '#6b6b8a' : '#fff', cursor: page === pages ? 'default' : 'pointer', fontFamily: 'Syne, sans-serif' }}>→</button>
            </div>
          )}
        </div>

        {/* Ban Modal */}
        {showBanModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowBanModal(false)}>
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '16px', padding: '32px', width: '400px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Ban User</h3>
              <p style={{ color: '#6b6b8a', fontSize: '14px', marginBottom: '20px' }}>Banning <strong style={{ color: '#fff' }}>{selectedUser?.email}</strong></p>
              <textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason for ban (optional)" rows={3}
                style={{ width: '100%', padding: '12px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: 'Syne, sans-serif', outline: 'none', resize: 'vertical', marginBottom: '20px' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowBanModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#9999bb', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Cancel</button>
                <button onClick={handleBan} style={{ flex: 1, padding: '12px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', color: '#f87171', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: '600' }}>Ban User</button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowUpgradeModal(false)}>
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '16px', padding: '32px', width: '400px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Change Plan</h3>
              <p style={{ color: '#6b6b8a', fontSize: '14px', marginBottom: '20px' }}>Updating plan for <strong style={{ color: '#fff' }}>{selectedUser?.email}</strong></p>
              <select value={upgradePlan} onChange={e => setUpgradePlan(e.target.value)}
                style={{ width: '100%', padding: '12px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: 'Syne, sans-serif', outline: 'none', marginBottom: '20px' }}>
                <option value="free">Free</option>
                <option value="pro">Pro (₹799/mo)</option>
                <option value="team">Team (₹2499/mo)</option>
              </select>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowUpgradeModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#9999bb', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Cancel</button>
                <button onClick={handleUpgrade} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: '600' }}>Update Plan</button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(AdminUsers);
