import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

const CATEGORIES = ['Integration', 'Communication', 'DevOps', 'Cloud', 'ITSM', 'Security', 'HR', 'CRM'];
const EMPTY_SPOKE = { slug: '', name: '', description: '', icon: '🔌', category: 'Integration', plugin_id: '', credential_type: 'OAuth 2.0', official_description: '', personal_tip: '', ai_description: '', setup_steps: '', actions: '', common_errors: '', code_example: '', tags: '' };

function AdminSpokes() {
  const router = useRouter();
  const [spokes, setSpokes] = useState([]);
  const [errMsg, setErrMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSpoke, setEditSpoke] = useState(null);
  const [form, setForm] = useState(EMPTY_SPOKE);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSpokes(); }, [page]);

  const fetchSpokes = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/spokes', { params: { page, limit: 20, search } });
      setSpokes(res.data.spokes);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      if (err.response?.status === 401) router.push('/admin');
    } finally { setLoading(false); }
  };

  const openCreate = () => { setEditSpoke(null); setForm(EMPTY_SPOKE); setShowModal(true); };
  const openEdit = (spoke) => {
    setEditSpoke(spoke);
    setForm({
      ...spoke,
      setup_steps: Array.isArray(spoke.setup_steps) ? spoke.setup_steps.join('\n') : '',
      actions: Array.isArray(spoke.actions) ? spoke.actions.map(a => typeof a === 'string' ? a : `${a.name}: ${a.description}`).join('\n') : '',
      common_errors: Array.isArray(spoke.common_errors) ? spoke.common_errors.map(e => typeof e === 'string' ? e : `${e.error} | ${e.fix}`).join('\n') : '',
      tags: Array.isArray(spoke.tags) ? spoke.tags.join(', ') : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.slug || !form.name) { setErrMsg('Slug and name are required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        setup_steps: form.setup_steps.split('\n').filter(s => s.trim()),
        actions: form.actions.split('\n').filter(s => s.trim()).map(a => {
          const [name, ...rest] = a.split(':');
          return rest.length ? { name: name.trim(), description: rest.join(':').trim() } : { name: a.trim(), description: '' };
        }),
        common_errors: form.common_errors.split('\n').filter(s => s.trim()).map(e => {
          const [error, fix] = e.split('|');
          return fix ? { error: error.trim(), fix: fix.trim() } : { error: e.trim(), fix: '' };
        }),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (editSpoke) {
        await axios.put('/api/admin/spokes', { ...payload, id: editSpoke.id });
      } else {
        await axios.post('/api/admin/spokes', payload);
      }
      setShowModal(false);
      fetchSpokes();
    } catch (err) {
      setErrMsg(err.response?.data?.error || err.message || 'Failed to save spoke');
    } finally { setSaving(false); }
  };

  const handleDelete = async (spoke) => {
    if (!confirm(`Delete spoke "${spoke.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete('/api/admin/spokes', { data: { id: spoke.id } });
      fetchSpokes();
    } catch(e) { setErrMsg('Failed to delete spoke'); }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '8px', color: '#fff', fontSize: '13px', fontFamily: 'Syne, sans-serif', outline: 'none', marginBottom: '12px' };
  const labelStyle = { display: 'block', color: '#9999bb', fontSize: '12px', fontWeight: '500', marginBottom: '4px' };

  return (
    <>
      <Head><title>Spokes — Admin snspokes</title></Head>
      <AdminLayout title="Spoke Management">

        {/* Header */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
            <input type="text" placeholder="Search spokes..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchSpokes()}
              style={{ flex: 1, padding: '10px 16px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: 'Syne, sans-serif', outline: 'none' }} />
            <button onClick={fetchSpokes} style={{ padding: '10px 20px', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: '10px', color: '#8b85ff', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '14px' }}>Search</button>
          </div>
          <button onClick={openCreate} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap' }}>
            + Add Spoke
          </button>
        </div>

        {/* Table */}
        <div style={{ background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e1e2e' }}>
                  {['Spoke', 'Category', 'Plugin ID', 'Views', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#6b6b8a', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: '#6b6b8a' }}>Loading...</td></tr>
                ) : spokes.map(spoke => (
                  <tr key={spoke.id} style={{ borderBottom: '1px solid #1e1e2e' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{spoke.icon}</span>
                        <div>
                          <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{spoke.name}</div>
                          <div style={{ color: '#6b6b8a', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>/{spoke.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 8px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '6px', fontSize: '11px', color: '#8b85ff' }}>{spoke.category}</span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6b6b8a', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>{spoke.plugin_id || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#9999bb', fontSize: '13px' }}>{spoke.view_count || 0}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEdit(spoke)} style={{ padding: '5px 10px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '6px', color: '#8b85ff', fontSize: '11px', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>✏️ Edit</button>
                        <a href={`/spoke/${spoke.slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '6px', color: '#4ade80', fontSize: '11px', cursor: 'pointer', textDecoration: 'none' }}>👁️ View</a>
                        <button onClick={() => handleDelete(spoke)} style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', fontSize: '11px', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>🗑️</button>
                      </div>
                    </td>
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

        {/* Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }} onClick={() => setShowModal(false)}>
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>{editSpoke ? '✏️ Edit Spoke' : '+ Add New Spoke'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Slug *</label><input style={inputStyle} value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} placeholder="slack" disabled={!!editSpoke} /></div>
                <div><label style={labelStyle}>Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Slack" /></div>
                <div><label style={labelStyle}>Icon (emoji)</label><input style={inputStyle} value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} placeholder="💬" /></div>
                <div><label style={labelStyle}>Category</label>
                  <select style={{...inputStyle}} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Plugin ID</label><input style={inputStyle} value={form.plugin_id} onChange={e => setForm({...form, plugin_id: e.target.value})} placeholder="com.glide.hub.spoke.slack" /></div>
                <div><label style={labelStyle}>Credential Type</label><input style={inputStyle} value={form.credential_type} onChange={e => setForm({...form, credential_type: e.target.value})} placeholder="OAuth 2.0" /></div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Description</label><textarea style={{...inputStyle, resize: 'vertical'}} rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Brief description..." />
                <label style={labelStyle}>AI Explanation</label><textarea style={{...inputStyle, resize: 'vertical'}} rows={3} value={form.ai_description} onChange={e => setForm({...form, ai_description: e.target.value})} placeholder="Simple AI explanation..." />
                <label style={labelStyle}>Developer Tip</label><textarea style={{...inputStyle, resize: 'vertical'}} rows={2} value={form.personal_tip} onChange={e => setForm({...form, personal_tip: e.target.value})} placeholder="Practical developer tip..." />
                <label style={labelStyle}>Setup Steps (one per line)</label><textarea style={{...inputStyle, resize: 'vertical'}} rows={4} value={form.setup_steps} onChange={e => setForm({...form, setup_steps: e.target.value})} placeholder="Step 1&#10;Step 2&#10;Step 3" />
                <label style={labelStyle}>Actions (name: description, one per line)</label><textarea style={{...inputStyle, resize: 'vertical'}} rows={4} value={form.actions} onChange={e => setForm({...form, actions: e.target.value})} placeholder="Send Message: Sends a message to a channel&#10;Create Channel: Creates a new channel" />
                <label style={labelStyle}>Common Errors (error | fix, one per line)</label><textarea style={{...inputStyle, resize: 'vertical'}} rows={3} value={form.common_errors} onChange={e => setForm({...form, common_errors: e.target.value})} placeholder="401 Unauthorized | Refresh OAuth token&#10;404 Not Found | Check channel ID" />
                <label style={labelStyle}>Code Example</label><textarea style={{...inputStyle, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px'}} rows={4} value={form.code_example} onChange={e => setForm({...form, code_example: e.target.value})} placeholder="// ServiceNow code example" />
                <label style={labelStyle}>Tags (comma separated)</label><input style={inputStyle} value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="messaging, notifications, collaboration" />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#9999bb', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: '600', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editSpoke ? 'Update Spoke' : 'Create Spoke'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(AdminSpokes);
