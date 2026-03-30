import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

function EnvManager() {
  const [vars, setVars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newVar, setNewVar] = useState({ key: '', value: '', comment: '' });
  const [search, setSearch] = useState('');
  const [revealed, setRevealed] = useState({});

  const showToast = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 4000); };

  const fetchVars = async () => {
    try {
      const res = await axios.get('/api/admin/env');
      setVars(res.data.vars?.filter(v => v.type === 'var') || []);
    } catch (err) {
      if (err.response?.status === 401) window.location.href = '/admin';
      else showToast('Failed to load env vars', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchVars(); }, []);

  const handleSave = async (key) => {
    setSaving(true);
    try {
      await axios.put('/api/admin/env', { key, value: editVal });
      showToast(`${key} updated — restart app to apply`);
      setEditing(null);
      fetchVars();
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!newVar.key.trim()) { showToast('Key required', 'error'); return; }
    setSaving(true);
    try {
      await axios.post('/api/admin/env', newVar);
      showToast(`${newVar.key} added`);
      setShowAdd(false); setNewVar({ key: '', value: '', comment: '' });
      fetchVars();
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (key) => {
    if (!confirm(`Remove ${key} from .env.local?`)) return;
    try {
      await axios.delete('/api/admin/env', { data: { key } });
      showToast(`${key} removed`);
      fetchVars();
    } catch { showToast('Failed', 'error'); }
  };

  const filtered = vars.filter(v => !search || v.key?.toLowerCase().includes(search.toLowerCase()));

  const CATEGORIES = {
    DB: vars.filter(v => /^DB_/.test(v.key)),
    AUTH: vars.filter(v => /^(NEXTAUTH|GOOGLE)/.test(v.key)),
    AI: vars.filter(v => /^(OPENROUTER|OLLAMA)/.test(v.key)),
    ADMIN: vars.filter(v => /^ADMIN/.test(v.key)),
    OTHER: vars.filter(v => !/(^DB_|^NEXTAUTH|^GOOGLE|^OPENROUTER|^OLLAMA|^ADMIN)/.test(v.key)),
  };

  const inp = { width: '100%', padding: '7px 10px', border: '1px solid #1e1e2e', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', outline: 'none', background: '#0d0d1a' };

  return (
    <>
      <Head><title>Environment Manager — snspokes Admin</title></Head>
      <AdminLayout title="Environment Manager" breadcrumbs={['System', 'Env Manager']}>

        <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '2px' }}>Changes require app restart</p>
            <p style={{ fontSize: '12px', color: '#b45309' }}>After updating any variable, run: <code style={{ background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>docker restart snspokes_nextjs</code></p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search variables..." style={{ border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'inherit', flex: 1 }} />
          </div>
          <button onClick={() => setShowAdd(true)} style={{ padding: '8px 16px', background: '#6c63ff', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Variable</button>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Loading...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(CATEGORIES).filter(([, items]) => items.length > 0).map(([cat, items]) => (
              <div key={cat} style={{ background: '#0f0f1a', borderRadius: '12px', border: '1px solid #1e1e2e', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#0d0d1a', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b6b8a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{cat}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>({items.length})</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <tbody>
                    {items.filter(v => !search || v.key.toLowerCase().includes(search.toLowerCase())).map((v, i) => (
                      <tr key={v.key} style={{ borderBottom: i < items.length - 1 ? '1px solid #1e1e2e' : 'none' }}>
                        <td style={{ padding: '12px 16px', width: '40%' }}>
                          <code style={{ fontFamily: 'monospace', fontSize: '12px', color: '#9999bb', fontWeight: '600' }}>{v.key}</code>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {editing === v.key ? (
                            <input value={editVal} onChange={e => setEditVal(e.target.value)} style={inp} autoFocus onKeyDown={e => e.key === 'Enter' && handleSave(v.key)} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <code style={{ fontFamily: 'monospace', fontSize: '12px', color: v.sensitive && !revealed[v.key] ? '#9ca3af' : '#9999bb', background: '#0d0d1a', padding: '3px 8px', borderRadius: '4px', border: '1px solid #1e1e2e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                                {v.sensitive && !revealed[v.key] ? v.value : v.value || <span style={{ fontStyle: 'italic', opacity: 0.4 }}>empty</span>}
                              </code>
                              {v.sensitive && (
                                <button onClick={() => setRevealed(r => ({ ...r, [v.key]: !r[v.key] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '12px' }}>
                                  {revealed[v.key] ? '🙈' : '👁️'}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', width: '160px' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {editing === v.key ? (
                              <>
                                <button onClick={() => handleSave(v.key)} disabled={saving} style={{ padding: '4px 12px', background: '#6c63ff', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                                <button onClick={() => setEditing(null)} style={{ padding: '4px 10px', background: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditing(v.key); setEditVal(v.masked ? '' : v.value); }}
                                  style={{ padding: '4px 10px', background: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#9999bb' }}>Edit</button>
                                <button onClick={() => handleDelete(v.key)}
                                  style={{ padding: '4px 10px', background: '#2d0a0a', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#dc2626' }}>Del</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAdd && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowAdd(false)}>
            <div style={{ background: '#0f0f1a', borderRadius: '14px', padding: '24px', width: '440px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', marginBottom: '18px' }}>Add Environment Variable</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#9999bb', display: 'block', marginBottom: '4px' }}>Variable Name *</label>
                  <input style={{...inp, fontFamily: 'monospace'}} value={newVar.key} onChange={e => setNewVar({...newVar, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g,'_')})} placeholder="MY_API_KEY" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#9999bb', display: 'block', marginBottom: '4px' }}>Value</label>
                  <input style={{...inp, fontFamily: 'monospace'}} value={newVar.value} onChange={e => setNewVar({...newVar, value: e.target.value})} placeholder="value here" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#9999bb', display: 'block', marginBottom: '4px' }}>Comment (optional)</label>
                  <input style={inp} value={newVar.comment} onChange={e => setNewVar({...newVar, comment: e.target.value})} placeholder="Description of this variable" /></div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '9px', background: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>Cancel</button>
                <button onClick={handleAdd} disabled={saving} style={{ flex: 2, padding: '9px', background: '#6c63ff', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>Add Variable</button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, padding: '12px 18px', borderRadius: '10px', background: toast.type === 'error' ? '#2d0a0a' : '#052e16', border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`, color: toast.type === 'error' ? '#dc2626' : '#16a34a', fontSize: '13px', fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {toast.type === 'error' ? '⚠️' : '✅'} {toast.text}
          </div>
        )}
      </AdminLayout>
    </>
  );
}


export default withAdminPage(EnvManager);

export const getServerSideProps = async () => ({ props: {} });
