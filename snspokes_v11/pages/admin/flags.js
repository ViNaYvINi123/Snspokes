import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import axios from 'axios';

const ENV_COLORS = { all: '#6c63ff', beta: '#f59e0b', prod: '#10b981', dev: '#0ea5e9' };

function Toggle({ enabled, onChange, loading }) {
  return (
    <button onClick={onChange} disabled={loading} style={{
      width: '40px', height: '22px', borderRadius: '11px',
      background: enabled ? '#6c63ff' : '#d1d5db',
      border: 'none', cursor: loading ? 'wait' : 'pointer',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: enabled ? '21px' : '3px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

const EMPTY = { key: '', label: '', description: '', enabled: true, rollout_pct: 100, environment: 'all' };

export default function AdminFlags() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editFlag, setEditFlag] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFlags = async () => {
    try {
      const res = await axios.get('/api/admin/flags');
      setFlags(res.data.flags || []);
    } catch (err) {
      if (err.response?.status === 401) window.location.href = '/admin';
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchFlags(); }, []);

  const handleToggle = async (flag) => {
    setToggling(flag.id);
    try {
      await axios.patch('/api/admin/flags', { id: flag.id, enabled: !flag.enabled });
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f));
      showToast(`${flag.label} ${!flag.enabled ? 'enabled' : 'disabled'}`);
    } catch { showToast('Failed to toggle', 'error'); }
    finally { setToggling(null); }
  };

  const handleSave = async () => {
    if (!form.key?.trim() || !form.label?.trim()) {
      showToast('Key and label are required', 'error'); return;
    }
    setSaving(true);
    try {
      if (editFlag) {
        await axios.put('/api/admin/flags', { ...form, id: editFlag.id });
        showToast('Flag updated');
      } else {
        await axios.post('/api/admin/flags', form);
        showToast('Flag created');
      }
      setShowModal(false); setEditFlag(null); setForm(EMPTY);
      fetchFlags();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (flag) => {
    if (!confirm(`Delete flag "${flag.key}"?`)) return;
    try {
      await axios.delete('/api/admin/flags', { data: { id: flag.id } });
      showToast('Flag deleted');
      fetchFlags();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const filtered = flags.filter(f =>
    !search || f.key.includes(search.toLowerCase()) || f.label.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = flags.filter(f => f.enabled).length;

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', color: '#111827', background: '#fff' };

  return (
    <>
      <Head><title>Feature Flags — snspokes Admin</title></Head>
      <AdminLayout title="Feature Flags" breadcrumbs={['Feature Flags']}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flags..." style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#374151', fontFamily: 'inherit', width: '160px' }} />
            </div>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{enabledCount}/{flags.length} enabled</span>
          </div>
          <button onClick={() => { setEditFlag(null); setForm(EMPTY); setShowModal(true); }}
            style={{ padding: '8px 16px', background: '#111827', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            + New Flag
          </button>
        </div>

        {/* Flags Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>Loading flags...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
            {filtered.map(flag => (
              <div key={flag.id} style={{ background: '#fff', border: `1px solid ${flag.enabled ? '#e5e7eb' : '#f3f4f6'}`, borderRadius: '12px', padding: '18px', opacity: flag.enabled ? 1 : 0.7, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{flag.label}</span>
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '20px', background: `${ENV_COLORS[flag.environment] || '#6c63ff'}15`, color: ENV_COLORS[flag.environment] || '#6c63ff', border: `1px solid ${ENV_COLORS[flag.environment] || '#6c63ff'}30`, fontWeight: '600' }}>{flag.environment}</span>
                    </div>
                    <code style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>{flag.key}</code>
                  </div>
                  <Toggle enabled={flag.enabled} onChange={() => handleToggle(flag)} loading={toggling === flag.id} />
                </div>
                {flag.description && <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', lineHeight: '1.5' }}>{flag.description}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {flag.rollout_pct < 100 && (
                      <span style={{ fontSize: '11px', color: '#f59e0b', background: '#fef3c7', padding: '2px 8px', borderRadius: '20px', border: '1px solid #fcd34d', fontWeight: '600' }}>
                        {flag.rollout_pct}% rollout
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: flag.enabled ? '#16a34a' : '#9ca3af', fontWeight: '600' }}>
                      {flag.enabled ? '● ON' : '○ OFF'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setEditFlag(flag); setForm({ ...flag }); setShowModal(true); }}
                      style={{ padding: '4px 10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#374151' }}>Edit</button>
                    <button onClick={() => handleDelete(flag)}
                      style={{ padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#dc2626' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }} onClick={() => setShowModal(false)}>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>{editFlag ? 'Edit Flag' : 'New Feature Flag'}</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '5px' }}>Key *</label>
                  <input style={inp} value={form.key} onChange={e => setForm({...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'_')})} placeholder="my_feature_flag" disabled={!!editFlag} /></div>
                <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '5px' }}>Label *</label>
                  <input style={inp} value={form.label} onChange={e => setForm({...form, label: e.target.value})} placeholder="My Feature Flag" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '5px' }}>Description</label>
                  <textarea style={{...inp, resize: 'vertical'}} rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What does this flag control?" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '5px' }}>Environment</label>
                    <select style={inp} value={form.environment} onChange={e => setForm({...form, environment: e.target.value})}>
                      <option value="all">All</option><option value="prod">Production</option><option value="beta">Beta</option><option value="dev">Development</option>
                    </select></div>
                  <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '5px' }}>Rollout %</label>
                    <input style={inp} type="number" min="0" max="100" value={form.rollout_pct} onChange={e => setForm({...form, rollout_pct: parseInt(e.target.value)})} /></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle enabled={form.enabled} onChange={() => setForm(f => ({...f, enabled: !f.enabled}))} />
                  <span style={{ fontSize: '13px', color: '#374151' }}>{form.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', color: '#374151' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', background: '#111827', border: 'none', borderRadius: '8px', color: '#fff', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600' }}>
                  {saving ? 'Saving...' : editFlag ? 'Update Flag' : 'Create Flag'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, padding: '12px 18px', borderRadius: '10px', background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`, color: toast.type === 'error' ? '#dc2626' : '#16a34a', fontSize: '13px', fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {toast.type === 'error' ? '⚠️' : '✅'} {toast.text}
          </div>
        )}
      </AdminLayout>
    </>
  );
}
