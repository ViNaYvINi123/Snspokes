import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';
import axios from 'axios';

const METHOD_COLORS = { GET:'#10b981',POST:'#6c63ff',PUT:'#f59e0b',DELETE:'#ef4444',PATCH:'#0ea5e9' };
const AUTH_TYPES = ['none','api_key','bearer','basic','oauth2'];
const EMPTY_CONNECTOR = { name:'',slug:'',description:'',base_url:'',auth_type:'none',auth_config:{},default_headers:{},timeout_ms:10000,is_active:true };
const EMPTY_ENDPOINT = { name:'',path:'/',method:'GET',description:'',params_schema:'',body_schema:'',response_map:'',cache_ttl:0 };

function Badge({ color, children }) {
  return <span style={{ padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'600',background:`${color}15`,color,border:`1px solid ${color}30` }}>{children}</span>;
}

function Card({ children, style={} }) {
  return <div style={{ background:'#0f0f1a',border:'1px solid #1e1e2e',borderRadius:'12px',overflow:'hidden',...style }}>{children}</div>;
}

function SH({ title, action }) {
  return (
    <div style={{ padding:'12px 16px',borderBottom:'1px solid #1e1e2e',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
      <span style={{ fontSize:'13px',fontWeight:'600',color:'#e2e8f0' }}>{title}</span>
      {action}
    </div>
  );
}

function Btn({ onClick, children, variant='primary', small=false, disabled=false }) {
  const styles = {
    primary:  { background:'#e2e8f0',color:'#fff',border:'none' },
    secondary:{ background:'#0d0d1a',color:'#9999bb',border:'1px solid #1e1e2e' },
    danger:   { background:'#2d0a0a',color:'#dc2626',border:'1px solid #fecaca' },
    success:  { background:'#052e16',color:'#16a34a',border:'1px solid #bbf7d0' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: small ? '4px 10px' : '8px 14px', borderRadius:'7px', fontSize: small ? '12px' : '13px', fontWeight:'600', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily:'inherit', transition:'all 0.12s', opacity: disabled ? 0.6 : 1, ...styles[variant] }}>
      {children}
    </button>
  );
}

function Toast({ msg, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  const ok = msg.type !== 'error';
  return (
    <div style={{ position:'fixed',bottom:'24px',right:'24px',zIndex:9999,padding:'12px 18px',borderRadius:'10px',background: ok ? '#052e16' : '#2d0a0a',border:`1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,color: ok ? '#16a34a' : '#dc2626',fontSize:'13px',fontWeight:'500',boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
      {ok ? '✅' : '⚠️'} {msg.text}
    </div>
  );
}

function APIConnectors() {
  const [connectors, setConnectors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | edit | tester | webhooks
  const [form, setForm] = useState(EMPTY_CONNECTOR);
  const [epForm, setEpForm] = useState(EMPTY_ENDPOINT);
  const [editEp, setEditEp] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testConfig, setTestConfig] = useState({ path:'/', method:'GET', params:'{}', body:'{}' });
  const [stats, setStats] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [webhooks, setWebhooks] = useState([]);

  const showToast = (text, type='success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500); };

  const fetchConnectors = async () => {
    try {
      const res = await axios.get('/api/admin/connectors');
      setConnectors(res.data.connectors || []);
    } catch (err) {
      if (err.response?.status === 401) window.location.href = '/admin';
    } finally { setLoading(false); }
  };

  const fetchConnectorDetail = async (id) => {
    try {
      const [detailRes, statsRes] = await Promise.all([
        axios.get(`/api/admin/connectors?id=${id}`),
        axios.get(`/api/admin/connectors?id=${id}&stats=true`),
      ]);
      setSelected(detailRes.data.connector);
      setEndpoints(detailRes.data.endpoints || []);
      setStats(statsRes.data.stats || {});
    } catch {}
  };

  const fetchWebhooks = async () => {
    try {
      const res = await axios.get('/api/admin/webhooks');
      setWebhooks(res.data.webhooks || []);
    } catch {}
  };

  useEffect(() => { fetchConnectors(); }, []);

  const handleSaveConnector = async () => {
    if (!form.name?.trim() || !form.base_url?.trim()) { showToast('Name and base URL required', 'error'); return; }
    setSaving(true);
    try {
      if (form.id) {
        await axios.put('/api/admin/connectors', form);
        showToast('Connector updated');
      } else {
        await axios.post('/api/admin/connectors', form);
        showToast('Connector created');
      }
      setView('list'); setForm(EMPTY_CONNECTOR);
      fetchConnectors();
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDeleteConnector = async (id) => {
    if (!confirm('Delete this connector and all its endpoints?')) return;
    try {
      await axios.delete('/api/admin/connectors', { data: { id } });
      showToast('Connector deleted');
      fetchConnectors();
      if (selected?.id === id) { setSelected(null); setView('list'); }
    } catch { showToast('Failed', 'error'); }
  };

  const handleSaveEndpoint = async () => {
    if (!selected) return;
    try {
      const payload = { ...epForm, connector_id: selected.id };
      if (editEp) { await axios.put('/api/admin/endpoints', { ...payload, id: editEp.id }); showToast('Endpoint updated'); }
      else { await axios.post('/api/admin/endpoints', payload); showToast('Endpoint added'); }
      setEditEp(null); setEpForm(EMPTY_ENDPOINT);
      fetchConnectorDetail(selected.id);
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const handleTest = async () => {
    if (!selected) return;
    setTestLoading(true); setTestResult(null);
    try {
      let params = {}, body = null;
      try { params = JSON.parse(testConfig.params || '{}'); } catch {}
      try { body = testConfig.method !== 'GET' ? JSON.parse(testConfig.body || '{}') : null; } catch {}
      const res = await axios.post('/api/admin/api-execute', {
        connector_id: selected.id, method: testConfig.method,
        path: testConfig.path, params, body,
      });
      setTestResult(res.data);
    } catch (err) { setTestResult({ success: false, error: err.message }); }
    finally { setTestLoading(false); }
  };

  const handleCreateWebhook = async () => {
    const name = prompt('Webhook name:');
    if (!name) return;
    try {
      const res = await axios.post('/api/admin/webhooks', { name, generate_secret: true });
      showToast('Webhook created');
      fetchWebhooks();
    } catch { showToast('Failed', 'error'); }
  };

  const inp = { width:'100%',padding:'8px 12px',border:'1px solid #1e1e2e',borderRadius:'7px',fontSize:'13px',fontFamily:'inherit',outline:'none',color:'#e2e8f0',background:'#0f0f1a' };
  const lbl = { fontSize:'12px',fontWeight:'500',color:'#9999bb',display:'block',marginBottom:'4px' };

  return (
    <>
      <Head><title>API Connectors — snspokes Admin</title></Head>
      <AdminLayout title="API Integration Platform" breadcrumbs={['API Connectors']}>

        {/* View Tabs */}
        <div style={{ display:'flex',gap:'0',marginBottom:'20px',background:'#0f0f1a',border:'1px solid #1e1e2e',borderRadius:'10px',padding:'4px',width:'fit-content' }}>
          {[['list','🔌 Connectors'],['webhooks','📡 Webhooks']].map(([v,l]) => (
            <button key={v} onClick={() => { setView(v); if (v==='webhooks') fetchWebhooks(); }}
              style={{ padding:'7px 16px',borderRadius:'7px',border:'none',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit',background: view===v ? '#e2e8f0' : 'transparent',color: view===v ? '#fff' : '#6b7280',transition:'all 0.12s' }}>{l}</button>
          ))}
        </div>

        {/* ── CONNECTORS VIEW ── */}
        {(view === 'list' || view === 'edit' || view === 'tester') && (
          <div style={{ display:'grid',gridTemplateColumns: selected ? '280px 1fr' : '1fr',gap:'20px' }}>

            {/* Left: Connector list */}
            <div>
              <Card>
                <SH title="Connectors" action={<Btn small onClick={() => { setForm(EMPTY_CONNECTOR); setView('edit'); setSelected(null); }}>+ Add</Btn>} />
                {loading ? <div style={{ padding:'32px',textAlign:'center',color:'#9ca3af',fontSize:'13px' }}>Loading...</div> : (
                  <div>
                    {connectors.map(c => (
                      <div key={c.id} onClick={() => { setSelected(c); fetchConnectorDetail(c.id); setView('tester'); }}
                        style={{ padding:'12px 16px',borderBottom:'1px solid #1e1e2e',cursor:'pointer',display:'flex',alignItems:'center',gap:'10px',background: selected?.id===c.id ? '#0d0d1a' : 'transparent',transition:'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background='#0d0d1a'}
                        onMouseLeave={e => e.currentTarget.style.background= selected?.id===c.id ? '#0d0d1a' : 'transparent'}
                      >
                        <div style={{ width:'8px',height:'8px',borderRadius:'50%',background: c.is_active ? '#22c55e' : '#d1d5db',flexShrink:0 }} />
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:'13px',fontWeight:'600',color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.name}</div>
                          <div style={{ fontSize:'11px',color:'#9ca3af',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.base_url}</div>
                        </div>
                        <Badge color={c.auth_type === 'none' ? '#9ca3af' : '#6c63ff'}>{c.auth_type}</Badge>
                      </div>
                    ))}
                    {connectors.length === 0 && <div style={{ padding:'32px',textAlign:'center',color:'#9ca3af',fontSize:'13px' }}>No connectors yet</div>}
                  </div>
                )}
              </Card>
            </div>

            {/* Right: Detail / Edit / Test */}
            {selected && (
              <div style={{ display:'flex',flexDirection:'column',gap:'16px' }}>
                {/* Header */}
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div>
                    <h2 style={{ fontSize:'16px',fontWeight:'700',color:'#e2e8f0',marginBottom:'4px' }}>{selected.name}</h2>
                    <code style={{ fontSize:'12px',color:'#9ca3af' }}>{selected.base_url}</code>
                  </div>
                  <div style={{ display:'flex',gap:'8px' }}>
                    <Btn variant="secondary" small onClick={() => { setForm({...selected}); setView('edit'); }}>Edit</Btn>
                    <Btn variant="danger" small onClick={() => handleDeleteConnector(selected.id)}>Delete</Btn>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px' }}>
                  {[
                    { l:'Total Calls', v: stats.total_calls || 0 },
                    { l:'Avg Response', v: stats.avg_ms ? stats.avg_ms + 'ms' : '—' },
                    { l:'Error Rate', v: stats.error_rate || '0%' },
                    { l:'Endpoints', v: endpoints.length },
                  ].map(s => (
                    <Card key={s.l} style={{ padding:'14px' }}>
                      <div style={{ fontSize:'20px',fontWeight:'700',color:'#e2e8f0',marginBottom:'3px' }}>{s.v}</div>
                      <div style={{ fontSize:'11px',color:'#9ca3af' }}>{s.l}</div>
                    </Card>
                  ))}
                </div>

                {/* API Tester */}
                <Card>
                  <SH title="🧪 API Tester" />
                  <div style={{ padding:'16px',display:'grid',gridTemplateColumns:'100px 1fr',gap:'10px',marginBottom:'10px' }}>
                    <div>
                      <label style={lbl}>Method</label>
                      <select style={inp} value={testConfig.method} onChange={e => setTestConfig(t=>({...t,method:e.target.value}))}>
                        {Object.keys(METHOD_COLORS).map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Path</label>
                      <input style={inp} value={testConfig.path} onChange={e => setTestConfig(t=>({...t,path:e.target.value}))} placeholder="/api/endpoint" />
                    </div>
                  </div>
                  <div style={{ padding:'0 16px 10px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
                    <div>
                      <label style={lbl}>Params (JSON)</label>
                      <textarea style={{...inp,fontFamily:'monospace',fontSize:'12px',resize:'vertical'}} rows={3} value={testConfig.params} onChange={e => setTestConfig(t=>({...t,params:e.target.value}))} />
                    </div>
                    {testConfig.method !== 'GET' && (
                      <div>
                        <label style={lbl}>Body (JSON)</label>
                        <textarea style={{...inp,fontFamily:'monospace',fontSize:'12px',resize:'vertical'}} rows={3} value={testConfig.body} onChange={e => setTestConfig(t=>({...t,body:e.target.value}))} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding:'0 16px 16px',display:'flex',gap:'10px',alignItems:'center' }}>
                    <Btn onClick={handleTest} disabled={testLoading}>
                      {testLoading ? '⏳ Sending...' : '▶ Send Request'}
                    </Btn>
                    {testResult && (
                      <Badge color={testResult.success ? '#10b981' : '#ef4444'}>
                        {testResult.status_code || (testResult.success ? '200' : 'Error')} · {testResult.duration_ms}ms
                      </Badge>
                    )}
                  </div>
                  {testResult && (
                    <div style={{ margin:'0 16px 16px',borderRadius:'8px',border:'1px solid #1e1e2e',overflow:'hidden' }}>
                      <div style={{ padding:'8px 12px',background: testResult.success ? '#052e16' : '#2d0a0a',borderBottom:'1px solid #1e1e2e',display:'flex',gap:'12px',fontSize:'12px',fontWeight:'600' }}>
                        <span style={{ color: testResult.success ? '#16a34a' : '#dc2626' }}>{testResult.success ? '✅ Success' : '❌ Error'}</span>
                        {testResult.status_code && <span style={{ color:'#6b7280' }}>HTTP {testResult.status_code}</span>}
                        {testResult.duration_ms && <span style={{ color:'#6b7280' }}>{testResult.duration_ms}ms</span>}
                        {testResult.cached && <span style={{ color:'#6c63ff' }}>⚡ Cached</span>}
                      </div>
                      <pre style={{ padding:'12px',fontFamily:'monospace',fontSize:'12px',color:'#9999bb',overflow:'auto',maxHeight:'240px',margin:0,background:'#0d0d1a' }}>
                        {JSON.stringify(testResult.data || testResult.error || testResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </Card>

                {/* Endpoints */}
                <Card>
                  <SH title={`Endpoints (${endpoints.length})`} action={<Btn small onClick={() => { setEditEp(null); setEpForm(EMPTY_ENDPOINT); }}>+ Add</Btn>} />
                  {/* Quick add form */}
                  {!editEp && epForm !== EMPTY_ENDPOINT || true ? (
                    <div style={{ padding:'12px 16px',borderBottom:'1px solid #1e1e2e',display:'grid',gridTemplateColumns:'80px 1fr auto auto',gap:'8px',alignItems:'end' }}>
                      <div>
                        <label style={lbl}>Method</label>
                        <select style={inp} value={epForm.method} onChange={e => setEpForm(f=>({...f,method:e.target.value}))}>
                          {Object.keys(METHOD_COLORS).map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Path *</label>
                        <input style={inp} value={epForm.path} onChange={e => setEpForm(f=>({...f,path:e.target.value}))} placeholder="/users/{id}" />
                      </div>
                      <div>
                        <label style={lbl}>Name *</label>
                        <input style={{...inp,width:'120px'}} value={epForm.name} onChange={e => setEpForm(f=>({...f,name:e.target.value}))} placeholder="Get User" />
                      </div>
                      <div style={{ paddingTop:'18px' }}>
                        <Btn small onClick={handleSaveEndpoint}>{editEp ? 'Update' : 'Add'}</Btn>
                      </div>
                    </div>
                  ) : null}
                  {endpoints.map(ep => (
                    <div key={ep.id} style={{ padding:'10px 16px',borderBottom:'1px solid #1e1e2e',display:'flex',alignItems:'center',gap:'10px' }}>
                      <Badge color={METHOD_COLORS[ep.method] || '#6c63ff'}>{ep.method}</Badge>
                      <code style={{ fontSize:'13px',color:'#9999bb',flex:1 }}>{ep.path}</code>
                      <span style={{ fontSize:'12px',color:'#6b7280' }}>{ep.name}</span>
                      {ep.cache_ttl > 0 && <Badge color='#6c63ff'>cache {ep.cache_ttl}s</Badge>}
                      <div style={{ display:'flex',gap:'5px' }}>
                        <Btn small variant="secondary" onClick={() => { setEditEp(ep); setEpForm({...ep}); }}>Edit</Btn>
                        <Btn small variant="danger" onClick={async () => { await axios.delete('/api/admin/endpoints',{data:{id:ep.id}}); fetchConnectorDetail(selected.id); }}>×</Btn>
                      </div>
                    </div>
                  ))}
                  {endpoints.length === 0 && <div style={{ padding:'24px',textAlign:'center',color:'#9ca3af',fontSize:'13px' }}>No endpoints — add one above</div>}
                </Card>
              </div>
            )}

            {/* Edit form (full screen) */}
            {view === 'edit' && (
              <Card style={{ gridColumn: selected ? 'auto' : '1/-1' }}>
                <SH title={form.id ? 'Edit Connector' : 'New API Connector'} action={<Btn variant="secondary" small onClick={() => setView(selected ? 'tester' : 'list')}>Cancel</Btn>} />
                <div style={{ padding:'20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
                  <div><label style={lbl}>Name *</label><input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="My API" /></div>
                  <div><label style={lbl}>Base URL *</label><input style={inp} value={form.base_url} onChange={e=>setForm(f=>({...f,base_url:e.target.value}))} placeholder="https://api.example.com" /></div>
                  <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Description</label><input style={inp} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
                  <div><label style={lbl}>Auth Type</label>
                    <select style={inp} value={form.auth_type} onChange={e=>setForm(f=>({...f,auth_type:e.target.value,auth_config:{}}))}>
                      {AUTH_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Timeout (ms)</label><input style={inp} type="number" value={form.timeout_ms} onChange={e=>setForm(f=>({...f,timeout_ms:parseInt(e.target.value)}))} /></div>

                  {/* Auth config fields */}
                  {form.auth_type === 'api_key' && (
                    <>
                      <div><label style={lbl}>Header Name</label><input style={inp} value={form.auth_config?.header_name||'X-API-Key'} onChange={e=>setForm(f=>({...f,auth_config:{...f.auth_config,header_name:e.target.value}}))} /></div>
                      <div><label style={lbl}>API Key</label><input style={inp} type="password" value={form.auth_config?.api_key||''} onChange={e=>setForm(f=>({...f,auth_config:{...f.auth_config,api_key:e.target.value}}))} placeholder="Your API key" /></div>
                    </>
                  )}
                  {form.auth_type === 'bearer' && (
                    <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Bearer Token</label><input style={inp} type="password" value={form.auth_config?.token||''} onChange={e=>setForm(f=>({...f,auth_config:{...f.auth_config,token:e.target.value}}))} placeholder="Your token" /></div>
                  )}
                  {form.auth_type === 'basic' && (
                    <>
                      <div><label style={lbl}>Username</label><input style={inp} value={form.auth_config?.username||''} onChange={e=>setForm(f=>({...f,auth_config:{...f.auth_config,username:e.target.value}}))} /></div>
                      <div><label style={lbl}>Password</label><input style={inp} type="password" value={form.auth_config?.password||''} onChange={e=>setForm(f=>({...f,auth_config:{...f.auth_config,password:e.target.value}}))} /></div>
                    </>
                  )}

                  <div style={{ gridColumn:'1/-1',display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'8px',borderTop:'1px solid #1e1e2e' }}>
                    <Btn variant="secondary" onClick={() => setView(selected ? 'tester' : 'list')}>Cancel</Btn>
                    <Btn onClick={handleSaveConnector} disabled={saving}>{saving ? 'Saving...' : form.id ? 'Update Connector' : 'Create Connector'}</Btn>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── WEBHOOKS VIEW ── */}
        {view === 'webhooks' && (
          <div>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'16px' }}>
              <p style={{ fontSize:'13px',color:'#6b7280' }}>Create webhook endpoints to receive data from external systems</p>
              <Btn onClick={handleCreateWebhook}>+ Create Webhook</Btn>
            </div>
            <Card>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'13px' }}>
                <thead><tr style={{ background:'#0d0d1a',borderBottom:'1px solid #1e1e2e' }}>
                  {['Name','Webhook URL','Received','Last Activity','Status','Actions'].map(h=>(
                    <th key={h} style={{ padding:'10px 16px',textAlign:'left',fontSize:'11px',fontWeight:'600',color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.5px' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {webhooks.map(wh => (
                    <tr key={wh.id} style={{ borderBottom:'1px solid #1e1e2e' }}>
                      <td style={{ padding:'12px 16px',fontWeight:'600',color:'#e2e8f0' }}>{wh.name}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <code style={{ fontSize:'11px',color:'#6c63ff',background:'#ede9fe',padding:'3px 8px',borderRadius:'4px' }}>
                          {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain'}/api/webhooks/{wh.slug}
                        </code>
                      </td>
                      <td style={{ padding:'12px 16px',color:'#6b7280' }}>{wh.total_received || 0}</td>
                      <td style={{ padding:'12px 16px',color:'#9ca3af',fontSize:'12px' }}>{wh.last_received ? new Date(wh.last_received).toLocaleString() : 'Never'}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <Badge color={wh.is_active ? '#10b981' : '#9ca3af'}>{wh.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex',gap:'6px' }}>
                          <Btn small variant="secondary" onClick={async () => { await axios.patch('/api/admin/webhooks',{id:wh.id,is_active:!wh.is_active}); fetchWebhooks(); }}>{wh.is_active ? 'Disable' : 'Enable'}</Btn>
                          <Btn small variant="danger" onClick={async () => { if (confirm('Delete?')) { await axios.delete('/api/admin/webhooks',{data:{id:wh.id}}); fetchWebhooks(); } }}>Delete</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {webhooks.length === 0 && <tr><td colSpan={6} style={{ padding:'40px',textAlign:'center',color:'#9ca3af' }}>No webhooks yet</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        <Toast msg={toast} onClose={() => setToast(null)} />
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(APIConnectors);
