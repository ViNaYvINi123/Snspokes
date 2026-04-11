import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AdminAuditLog() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const headers = { 'x-admin-token': getAdminToken() };

  useEffect(() => {
    fetch(`/api/admin/audit-log${filter ? `?action=${filter}` : ''}`, { headers })
      .then(r => r.json()).then(d => { if (d.success) setData(d); }).catch(()=>{}).finally(() => setLoading(false));
  }, [filter]);

  const ACTION_COLORS = { impersonate:'#FFB347', ban:'#f87171', unban:'#4ade80', refund:'#0ea5e9', broadcast_email:'#a855f7', bulk_import:'#6c63ff', plan_change:'#00D4AA' };

  return (
    <>
      <Head><title>Audit Log — snspokes Admin</title></Head>
      <AdminLayout title="Audit Log">
        <div style={{ padding:'24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
            <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:0 }}>📋 Admin Audit Log</h1>
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ background:'#111827', border:'1px solid #1e1e2e', borderRadius:'8px', padding:'7px 12px', color:'#e2e8f0', fontSize:'13px', fontFamily:'inherit', outline:'none' }}>
              <option value="">All Actions</option>
              {(data?.actions || []).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ borderBottom:'1px solid #1e1e2e', background:'#111827' }}>
                {['Admin','Action','Target','Details','Time'].map(h => <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(data?.logs || []).map((log, i) => {
                  const c = ACTION_COLORS[log.action] || '#6b7280';
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                      <td style={{ padding:'10px 16px', color:'#e2e8f0', fontWeight:'600' }}>{log.admin}</td>
                      <td style={{ padding:'10px 16px' }}><span style={{ background:`${c}22`, color:c, padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' }}>{log.action}</span></td>
                      <td style={{ padding:'10px 16px', color:'#9999bb' }}>{log.target_type} #{log.target_id}</td>
                      <td style={{ padding:'10px 16px', color:'#6b7280', maxWidth:'300px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</td>
                      <td style={{ padding:'10px 16px', color:'#6b7280', whiteSpace:'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {!loading && (data?.logs || []).length === 0 && <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#6b7280' }}>No audit logs yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export default withAdminPage(AdminAuditLog);

export const getServerSideProps = async () => ({ props: {} });
