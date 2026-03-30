import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

const SOCIAL_TYPES = ['twitter', 'linkedin', 'github', 'discord', 'youtube', 'other'];

function FooterAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('brand');

  const headers = { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' };

  useEffect(() => {
    fetch('/api/admin/footer', { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setConfig(d.config); })
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const save = async () => {
    setSaving(true);
    const r = await fetch('/api/admin/footer', { method: 'POST', headers, body: JSON.stringify({ config }) });
    const d = await r.json();
    if (d.success) showMsg('Footer saved! Changes live in ~5 minutes (cache).');
    else showMsg(d.error || 'Save failed', 'error');
    setSaving(false);
  };

  const reset = async () => {
    if (!confirm('Reset footer to defaults?')) return;
    const r = await fetch('/api/admin/footer', { method: 'PATCH', headers });
    const d = await r.json();
    if (d.success) { setConfig(d.config); showMsg('Reset to defaults!'); }
  };

  const updateConfig = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

  const updateLink = (col, idx, field, val) => {
    const cols = { ...config.columns };
    const links = [...(cols[col] || [])];
    links[idx] = { ...links[idx], [field]: val };
    cols[col] = links;
    updateConfig('columns', cols);
  };

  const addLink = (col) => {
    const cols = { ...config.columns };
    cols[col] = [...(cols[col] || []), { label: '', href: '' }];
    updateConfig('columns', cols);
  };

  const removeLink = (col, idx) => {
    const cols = { ...config.columns };
    cols[col] = cols[col].filter((_, i) => i !== idx);
    updateConfig('columns', cols);
  };

  const addSocial = () => {
    updateConfig('social_links', [...(config.social_links || []), { type: 'twitter', url: '', label: '' }]);
  };

  const updateSocial = (idx, field, val) => {
    const links = [...(config.social_links || [])];
    links[idx] = { ...links[idx], [field]: val };
    updateConfig('social_links', links);
  };

  const removeSocial = (idx) => {
    updateConfig('social_links', (config.social_links || []).filter((_, i) => i !== idx));
  };

  const toggleColumn = (col) => {
    const hidden = config.hide_columns || [];
    if (hidden.includes(col)) {
      updateConfig('hide_columns', hidden.filter(c => c !== col));
    } else {
      updateConfig('hide_columns', [...hidden, col]);
    }
  };

  const addColumn = () => {
    const name = prompt('Column name (e.g. "Partners"):');
    if (!name?.trim()) return;
    updateConfig('columns', { ...config.columns, [name.trim()]: [] });
  };

  const renameColumn = (oldName) => {
    const newName = prompt('New column name:', oldName);
    if (!newName?.trim() || newName === oldName) return;
    const cols = { ...config.columns };
    cols[newName.trim()] = cols[oldName];
    delete cols[oldName];
    updateConfig('columns', cols);
  };

  const removeColumn = (col) => {
    if (!confirm(`Remove column "${col}" and all its links?`)) return;
    const cols = { ...config.columns };
    delete cols[col];
    updateConfig('columns', cols);
  };

  const s = {
    card:   { background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
    input:  { width: '100%', background: '#111827', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '8px 12px', color: '#e2e8f0', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
    label:  { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' },
    btn:    { padding: '7px 14px', background: 'linear-gradient(135deg,#6c63ff,#a855f7)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
    btnSm:  { padding: '4px 10px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: '6px', color: '#9999bb', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' },
    btnDel: { padding: '4px 10px', background: '#2d0a0a', border: '1px solid #ef444433', borderRadius: '6px', color: '#f87171', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' },
  };

  const TABS = [
    { id: 'brand',   label: '🏷️ Brand' },
    { id: 'links',   label: '🔗 Links' },
    { id: 'social',  label: '📱 Social' },
    { id: 'preview', label: '👁️ Preview' },
  ];

  if (loading) return <AdminLayout title="Footer"><div style={{ padding: '40px', color: '#6b7280', textAlign: 'center' }}>Loading...</div></AdminLayout>;

  return (
    <>
      <Head><title>Footer Config — snspokes Admin</title></Head>
      <AdminLayout title="Footer Configuration">
        <div style={{ padding: '24px', maxWidth: '900px' }}>

          {msg && (
            <div style={{ marginBottom: '16px', padding: '12px 20px', background: msg.type === 'success' ? '#052e16' : '#2d0a0a', border: `1px solid ${msg.type === 'success' ? '#16a34a' : '#dc2626'}`, borderRadius: '10px', color: msg.type === 'success' ? '#4ade80' : '#f87171', fontSize: '13px' }}>
              {msg.text}
            </div>
          )}

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: 0 }}>🦶 Footer Configuration</h1>
              <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '3px' }}>Changes go live in ~5 minutes (cached). No deploy needed.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={reset} style={s.btnSm}>Reset Defaults</button>
              <button onClick={save} disabled={saving} style={{ ...s.btn, opacity: saving ? 0.7 : 1 }}>
                {saving ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #1e1e2e' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === t.id ? '#6c63ff' : 'transparent'}`, color: activeTab === t.id ? '#fff' : '#6b7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: activeTab === t.id ? 600 : 400 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── BRAND TAB ─── */}
          {activeTab === 'brand' && config && (
            <div>
              <div style={s.card}>
                <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: '700', margin: '0 0 16px' }}>Brand Settings</h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={s.label}>Tagline (shown under logo)</label>
                  <input
                    value={config.tagline || ''}
                    onChange={e => updateConfig('tagline', e.target.value)}
                    placeholder="The definitive reference for..."
                    style={s.input}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={s.label}>Custom Bottom Text (optional — shown above copyright)</label>
                  <textarea
                    value={config.bottom_text || ''}
                    onChange={e => updateConfig('bottom_text', e.target.value)}
                    placeholder="e.g. Powered by Anthropic AI · Made for ServiceNow developers"
                    rows={2}
                    style={{ ...s.input, resize: 'vertical' }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={config.show_status_badge !== false}
                    onChange={e => updateConfig('show_status_badge', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#6c63ff' }}
                  />
                  <span style={{ color: '#e2e8f0', fontSize: '13px' }}>Show "All systems operational" status badge under logo</span>
                </label>
              </div>

              <div style={s.card}>
                <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: '700', margin: '0 0 12px' }}>Column Visibility</h3>
                <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '14px' }}>Toggle which link columns appear in the footer.</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {Object.keys(config.columns || {}).map(col => {
                    const hidden = (config.hide_columns || []).includes(col);
                    return (
                      <button key={col} onClick={() => toggleColumn(col)}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${hidden ? '#2a2a3e' : '#6c63ff44'}`, background: hidden ? '#1e1e2e' : '#6c63ff22', color: hidden ? '#6b7280' : '#8b85ff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', textDecoration: hidden ? 'line-through' : 'none' }}>
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── LINKS TAB ─── */}
          {activeTab === 'links' && config && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button onClick={addColumn} style={s.btn}>+ Add Column</button>
              </div>
              {Object.entries(config.columns || {}).map(([colName, links]) => (
                <div key={colName} style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: '700', margin: 0 }}>
                      {(config.hide_columns || []).includes(colName)
                        ? <span style={{ color: '#6b7280', textDecoration: 'line-through' }}>{colName}</span>
                        : colName}
                    </h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => renameColumn(colName)} style={s.btnSm}>Rename</button>
                      <button onClick={() => toggleColumn(colName)} style={s.btnSm}>
                        {(config.hide_columns || []).includes(colName) ? 'Show' : 'Hide'}
                      </button>
                      <button onClick={() => removeColumn(colName)} style={s.btnDel}>Remove</button>
                    </div>
                  </div>

                  {(links || []).map((link, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 36px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <input
                        value={link.label}
                        onChange={e => updateLink(colName, idx, 'label', e.target.value)}
                        placeholder="Label e.g. Pricing"
                        style={s.input}
                      />
                      <input
                        value={link.href}
                        onChange={e => updateLink(colName, idx, 'href', e.target.value)}
                        placeholder="/pricing or https://..."
                        style={s.input}
                      />
                      <select
                        value={link.ext ? 'external' : 'internal'}
                        onChange={e => updateLink(colName, idx, 'ext', e.target.value === 'external')}
                        style={{ ...s.input, padding: '8px 6px' }}>
                        <option value="internal">Internal</option>
                        <option value="external">External ↗</option>
                      </select>
                      <button onClick={() => removeLink(colName, idx)} style={{ ...s.btnDel, padding: '8px 10px', textAlign: 'center' }}>✕</button>
                    </div>
                  ))}

                  <button onClick={() => addLink(colName)} style={{ ...s.btnSm, marginTop: '8px' }}>+ Add Link</button>
                </div>
              ))}
            </div>
          )}

          {/* ─── SOCIAL TAB ─── */}
          {activeTab === 'social' && config && (
            <div>
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: '700', margin: 0 }}>Social Links</h3>
                    <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '3px' }}>Shown as icon buttons under the logo. Leave empty to hide.</p>
                  </div>
                  <button onClick={addSocial} style={s.btn}>+ Add Social</button>
                </div>

                {(config.social_links || []).length === 0 && (
                  <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                    No social links added. Click "+ Add Social" to add one.
                  </p>
                )}

                {(config.social_links || []).map((social, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 36px', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                    <select
                      value={social.type}
                      onChange={e => updateSocial(idx, 'type', e.target.value)}
                      style={{ ...s.input, padding: '8px 6px' }}>
                      {SOCIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      value={social.url}
                      onChange={e => updateSocial(idx, 'url', e.target.value)}
                      placeholder="https://twitter.com/snspokes"
                      style={s.input}
                    />
                    <input
                      value={social.label}
                      onChange={e => updateSocial(idx, 'label', e.target.value)}
                      placeholder="Tooltip label"
                      style={s.input}
                    />
                    <button onClick={() => removeSocial(idx)} style={{ ...s.btnDel, padding: '8px 10px', textAlign: 'center' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── PREVIEW TAB ─── */}
          {activeTab === 'preview' && config && (
            <div style={{ background: '#060810', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '40px 24px' }}>
              <p style={{ color: '#6b7280', fontSize: '11px', textAlign: 'center', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Preview (unsaved changes)
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px', marginBottom: '32px' }}>
                {/* Brand */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg,#6c63ff,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff', fontSize: '12px' }}>S</div>
                    <span style={{ fontWeight: '800', color: '#fff', fontSize: '14px' }}>snspokes<span style={{ color: '#6c63ff' }}>.com</span></span>
                  </div>
                  <p style={{ color: '#6b6b8a', fontSize: '12px', lineHeight: '1.5', maxWidth: '180px' }}>{config.tagline}</p>
                  {config.show_status_badge && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '12px', padding: '4px 10px', background: '#052e16', border: '1px solid #16a34a33', borderRadius: '20px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                      <span style={{ color: '#4ade80', fontSize: '10px', fontWeight: '600' }}>All systems operational</span>
                    </div>
                  )}
                  {(config.social_links || []).length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                      {config.social_links.map((s, i) => (
                        <div key={i} style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                          {s.type === 'twitter' ? '🐦' : s.type === 'github' ? '🐙' : s.type === 'linkedin' ? '💼' : s.type === 'discord' ? '💬' : '🔗'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Link columns */}
                {Object.entries(config.columns || {})
                  .filter(([col]) => !(config.hide_columns || []).includes(col))
                  .map(([colName, links]) => (
                    <div key={colName}>
                      <h4 style={{ color: '#fff', fontSize: '11px', fontWeight: '700', marginBottom: '10px', letterSpacing: '0.02em' }}>{colName}</h4>
                      {(links || []).map((link, i) => (
                        <div key={i} style={{ color: '#6b6b8a', fontSize: '11px', marginBottom: '7px' }}>
                          {link.label || '—'}{link.ext ? ' ↗' : ''}
                        </div>
                      ))}
                    </div>
                  ))}
              </div>

              {config.bottom_text && (
                <div style={{ borderTop: '1px solid #1e1e2e', paddingTop: '14px', marginBottom: '12px' }}>
                  <p style={{ color: '#4b4b6a', fontSize: '11px' }}>{config.bottom_text}</p>
                </div>
              )}

              <div style={{ borderTop: '1px solid #1e1e2e', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ color: '#4b4b6a', fontSize: '11px' }}>© {new Date().getFullYear()} snspokes — All rights reserved</span>
                <div style={{ display: 'flex', gap: '14px' }}>
                  {['Privacy', 'Terms', 'Status', 'Changelog'].map(l => (
                    <span key={l} style={{ color: '#4b4b6a', fontSize: '11px' }}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save bar */}
          <div style={{ position: 'sticky', bottom: '0', background: '#080810', borderTop: '1px solid #1e1e2e', padding: '14px 0', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button onClick={reset} style={{ padding: '8px 16px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: '8px', color: '#9999bb', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Reset Defaults</button>
            <button onClick={save} disabled={saving} style={{ ...s.btn, padding: '8px 20px', fontSize: '13px', opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}


export default withAdminPage(FooterAdmin);

export const getServerSideProps = async () => ({ props: {} });
