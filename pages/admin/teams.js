import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AdminTeams() {
  const [teams, setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const h = { 'x-admin-token': localStorage.getItem('admin_token')||'' };

  useEffect(() => {
    fetch('/api/admin/teams', { headers: h }).then(r=>r.json()).then(d=>{ if(d.success) setTeams(d.teams); }).finally(()=>setLoading(false));
  }, []);

  return (
    <>
      <Head><title>Teams — snspokes Admin</title></Head>
      <AdminLayout title="Enterprise Teams">
        <div style={{ padding:'24px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:'0 0 20px' }}>👥 Enterprise Teams</h1>
          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#111827', borderBottom:'1px solid #1e1e2e' }}>
                {['Team Name','Owner','Members','Invites Pending','Created'].map(h=>(
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontSize:'11px', textTransform:'uppercase', fontWeight:'600' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {teams.map((t,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                    <td style={{ padding:'10px 16px', color:'#e2e8f0', fontWeight:'600' }}>{t.name}</td>
                    <td style={{ padding:'10px 16px' }}><div style={{ color:'#e2e8f0' }}>{t.owner_name}</div><div style={{ color:'#6b7280', fontSize:'11px' }}>{t.owner_email}</div></td>
                    <td style={{ padding:'10px 16px', color:'#6c63ff', fontWeight:'700' }}>{t.member_count}</td>
                    <td style={{ padding:'10px 16px', color:'#FFB347' }}>{t.pending_invites}</td>
                    <td style={{ padding:'10px 16px', color:'#6b7280' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!loading && teams.length===0 && <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#6b7280' }}>No enterprise teams yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export default withAdminPage(AdminTeams);

export const getServerSideProps = async () => ({ props: {} });
