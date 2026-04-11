import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

// ── Constants ──
const TYPES = ['string', 'boolean', 'integer', 'password', 'list', 'json'];
const TYPE_COLORS = { string: '#6c63ff', boolean: '#4ade80', integer: '#f59e0b', password: '#f87171', list: '#a855f7', json: '#06b6d4' };
const EMPTY_FORM = { name: '', value: '', default_value: '', type: 'string', category: '', description: '', ai_description: '' };

// ── Toast notification ──
function Toast({ msg, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  const isError = msg.type === 'error';
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, padding: '14px 20px', borderRadius: '12px', background: isError ? '#1a0a0a' : '#0a1a0a', border: `1px solid ${isError ? 'rgba(239,68,68,0.5)' : 'rgba(74,222,128,0.5)'}`, color: isError ? '#f87171' : '#4ade80', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideUp 0.2s ease', maxWidth: '400px' }}>
      <span>{isError ? '⚠️' : '✅'}</span>
      <span>{msg.text}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '8px', fontSize: '16px', opacity: 0.6 }}>×</button>
    </div>
  );
}

// ── Property Modal ──
function PropertyModal({ prop, categories, onSave, onClose }) {
  const [form, setForm] = useState(prop || EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = 'Name is required';
    else if (form.name.trim().length < 3) e.name = 'Name must be at least 3 characters';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
    setErrors({});
    try {
      await onSave(form);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: null })); };

  const inputStyle = (hasError) => ({
    width: '100%', padding: '10px 12px', background: '#0a0a14',
    border: `1px solid ${hasError ? 'rgba(239,68,68,0.5)' : '#1e1e2e'}`, borderRadius: '8px',
    color: '#fff', fontSize: '13px', fontFamily: 'DM Sans', sans-serif, outline: 'none',
  });
  const labelStyle = { display: 'block', color: '#9999bb', fontSize: '12px', fontWeight: '600', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }} onClick={onClose}>
      <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>
            {prop ? '✏️ Edit Property' : '➕ Add System Property'}
          </h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1e1e2e', borderRadius: '8px', color: '#9999bb', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>

        {errors.submit && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '20px' }}>
            ⚠️ {errors.submit}
          </div>
        )}

        {/* Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Property Name *</label>
          <input style={inputStyle(errors.name)} value={form.name} onChange={e => set('name', e.target.value)} placeholder="glide.ui.dark_mode" />
          {errors.name && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.name}</p>}
          <p style={{ color: '#6b6b8a', fontSize: '11px', marginTop: '4px' }}>Use ServiceNow naming convention (e.g. glide.ui.property_name)</p>
        </div>

        {/* Value + Default */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Current Value</label>
            <input style={inputStyle(false)} value={form.value} onChange={e => set('value', e.target.value)} placeholder={form.type === 'boolean' ? 'true / false' : 'Value'} type={form.type === 'password' ? 'password' : 'text'} />
          </div>
          <div>
            <label style={labelStyle}>Default Value</label>
            <input style={inputStyle(false)} value={form.default_value} onChange={e => set('default_value', e.target.value)} placeholder="Default" />
          </div>
        </div>

        {/* Type + Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Type</label>
            <select style={inputStyle(false)} value={form.type} onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <input style={inputStyle(false)} list="categories-list" value={form.category} onChange={e => set('category', e.target.value)} placeholder="UI / Email / Security..." />
            <datalist id="categories-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle(false), resize: 'vertical' }} rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this property control?" />
        </div>

        {/* AI Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>AI Description (optional)</label>
          <textarea style={{ ...inputStyle(false), resize: 'vertical' }} rows={2} value={form.ai_description} onChange={e => set('ai_description', e.target.value)} placeholder="Simple explanation for non-technical users..." />
        </div>

        {/* Active toggle (edit only) */}
        {prop && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px', background: '#0a0a14', borderRadius: '8px', border: '1px solid #1e1e2e' }}>
            <input type="checkbox" id="is_active_toggle" checked={form.is_active !== false} onChange={e => set('is_active', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <label htmlFor="is_active_toggle" style={{ color: '#9999bb', fontSize: '14px', cursor: 'pointer' }}>Property is active</label>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#9999bb', cursor: 'pointer', fontFamily: 'DM Sans', sans-serif, fontSize: '14px' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: '12px', background: loading ? '#1e1e2e' : 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans', sans-serif, fontSize: '14px', fontWeight: '700' }}>
            {loading ? '⏳ Saving...' : prop ? '✅ Update Property' : '➕ Create Property'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
function AdminProperties() {
  const [props, setProps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editProp, setEditProp] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const searchTimer = useRef(null);

  const showToast = (text, type = 'success') => setToast({ text, type });
  const hideToast = () => setToast(null);

  const fetchProps = useCallback(async (p = 1, s = search, c = catFilter) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/properties', { params: { page: p, limit: 50, search: s, category: c } });
      setProps(res.data.properties || []);
      setCategories(res.data.categories || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch (err) {
      if (err.response?.status === 401) if (typeof window !== 'undefined') window.location.href = '/admin';
      else showToast(err.response?.data?.error || 'Failed to load properties', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, catFilter]);

  useEffect(() => { fetchProps(); }, [catFilter]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchProps(1, val, catFilter), 400);
  };

  const handleSave = async (form) => {
    try {
      if (editProp) {
        await axios.put('/api/admin/properties', { ...form, id: editProp.id });
        showToast('Property updated successfully ✅');
      } else {
        await axios.post('/api/admin/properties', form);
        showToast('Property created successfully ✅');
      }
      setShowModal(false);
      setEditProp(null);
      fetchProps(page);
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to save property');
    }
  };

  const handleDelete = async (prop) => {
    if (!confirm(`Delete property "${prop.name}"?\n\nThis cannot be undone.`)) return;
    setDeleting(prop.id);
    try {
      await axios.delete('/api/admin/properties', { data: { id: prop.id } });
      showToast('Property deleted');
      fetchProps(page);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (prop) => {
    try {
      await axios.put('/api/admin/properties', { ...prop, id: prop.id, is_active: !prop.is_active });
      fetchProps(page);
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const openCreate = () => { setEditProp(null); setShowModal(true); };
  const openEdit = (prop) => { setEditProp(prop); setShowModal(true); };

  return (
    <>
      <Head><title>System Properties — snspokes Admin</title></Head>
      <AdminLayout title="ServiceNow System Properties">
        <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '8px', padding: '8px 14px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '10px' }}>
            <span style={{ color: '#6b6b8a' }}>🔍</span>
            <input value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Search by name, description, value..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', fontFamily: 'DM Sans', sans-serif }} />
            {search && <button onClick={() => handleSearchChange('')} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', fontSize: '16px' }}>×</button>}
          </div>

          {/* Category filter */}
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
            style={{ padding: '10px 14px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '10px', color: catFilter ? '#fff' : '#9999bb', fontSize: '14px', fontFamily: 'DM Sans', sans-serif, outline: 'none' }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button onClick={openCreate} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'DM Sans', sans-serif, whiteSpace: 'nowrap' }}>
            + Add Property
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#6b6b8a' }}>{total} properties total</span>
          {search && <span style={{ fontSize: '13px', color: '#8b85ff' }}>· filtered by "{search}"</span>}
          {catFilter && <span style={{ fontSize: '13px', color: '#8b85ff' }}>· category: {catFilter}</span>}
        </div>

        {/* Table */}
        <div style={{ background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b6b8a' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #1e1e2e', borderTopColor: '#6c63ff', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
              Loading properties...
            </div>
          ) : props.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b6b8a' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚙️</div>
              <p style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>No properties found</p>
              <p style={{ fontSize: '14px', marginBottom: '20px' }}>{search ? 'Try a different search' : 'Click "+ Add Property" to create one'}</p>
              {!search && <button onClick={openCreate} style={{ padding: '10px 20px', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: '8px', color: '#8b85ff', cursor: 'pointer', fontFamily: 'DM Sans', sans-serif }}>Add First Property</button>}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e1e2e', background: '#0a0a14' }}>
                    {['Property Name', 'Value', 'Type', 'Category', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#6b6b8a', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {props.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #1e1e2e', opacity: p.is_active ? 1 : 0.5, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', maxWidth: '280px' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#8b85ff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: '11px', color: '#6b6b8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{p.description}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '180px' }}>
                        <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: p.type === 'password' ? '#6b6b8a' : '#c4c4e0', background: '#0a0a14', padding: '3px 8px', borderRadius: '4px', border: '1px solid #1e1e2e', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.type === 'password' ? '••••••••' : (p.value || <span style={{ fontStyle: 'italic', opacity: 0.4 }}>empty</span>)}
                        </code>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', background: `${TYPE_COLORS[p.type] || '#6c63ff'}15`, border: `1px solid ${TYPE_COLORS[p.type] || '#6c63ff'}30`, borderRadius: '20px', fontSize: '11px', color: TYPE_COLORS[p.type] || '#6c63ff', fontWeight: '600' }}>
                          {p.type || 'string'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#9999bb', fontSize: '13px', whiteSpace: 'nowrap' }}>{p.category || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => handleToggleActive(p)} style={{ padding: '4px 10px', background: p.is_active ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${p.is_active ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: '20px', fontSize: '11px', color: p.is_active ? '#4ade80' : '#f87171', cursor: 'pointer', fontFamily: 'DM Sans', sans-serif, fontWeight: '600' }}>
                          {p.is_active ? '● Active' : '○ Inactive'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openEdit(p)} style={{ padding: '5px 10px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '6px', color: '#8b85ff', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans', sans-serif }} title="Edit">✏️</button>
                          <button onClick={() => handleDelete(p)} disabled={deleting === p.id} style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', fontSize: '12px', cursor: deleting === p.id ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans', sans-serif, opacity: deleting === p.id ? 0.5 : 1 }} title="Delete">
                            {deleting === p.id ? '⏳' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && !loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '16px', borderTop: '1px solid #1e1e2e' }}>
              <button onClick={() => { setPage(p => Math.max(1, p - 1)); fetchProps(Math.max(1, page - 1)); }} disabled={page === 1}
                style={{ padding: '6px 14px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '6px', color: page === 1 ? '#6b6b8a' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'DM Sans', sans-serif }}>← Prev</button>
              <span style={{ color: '#9999bb', fontSize: '13px' }}>Page {page} of {pages}</span>
              <button onClick={() => { setPage(p => Math.min(pages, p + 1)); fetchProps(Math.min(pages, page + 1)); }} disabled={page === pages}
                style={{ padding: '6px 14px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '6px', color: page === pages ? '#6b6b8a' : '#fff', cursor: page === pages ? 'default' : 'pointer', fontFamily: 'DM Sans', sans-serif }}>Next →</button>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <PropertyModal
            prop={editProp}
            categories={categories}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditProp(null); }}
          />
        )}

        {/* Toast */}
        <Toast msg={toast} onClose={hideToast} />

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    </>
  );
}


export default withAdminPage(AdminProperties);

export const getServerSideProps = async () => ({ props: {} });
