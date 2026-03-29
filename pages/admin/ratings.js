import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AdminRatings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch(`/api/admin/ratings${filter ? `?spoke_slug=${filter}` : ''}`, { headers: { 'x-admin-token': localStorage.getItem('admin_token') || '' } })
      .then(r => r.json()).then(d => { if (d.success) setData(d); }).finally(() => setLoading(false));
  }, [filter]);

  const deleteRating = async (id) => {
    await fetch('/api/admin/ratings', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' }, body: JSON.stringify({ id }) });
    setData(prev => ({ ...prev, ratings: prev.ratings.filter(r => r.id !== id) }));
  };

  const resetRatings = async (slug) => {
    if (!confirm(`Reset ALL ratings for ${slug}?`)) return;
    await fetch('/api/admin/ratings', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' }, body: JSON.stringify({ action: 'reset', spoke_slug: slug }) });
    setData(prev => ({ ...prev, ratings: prev.ratings.filter(r => r.spoke_slug !== slug) }));
  };

  return (
    <>
      <Head><title>Ratings — snspokes Admin</title></Head>
      <AdminLayout title="Spoke Ratings">
        <div style={{ padding:'24px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:'0 0 20px' }}>⭐ Spoke Ratings</h1>

          {/* Top rated spokes */}
          {data?.top_spokes?.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px', marginBottom:'24px' }}>
              {data.top_spokes.slice(0,5).map(s => (
                <div key={s.spoke_slug} style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'10px', padding:'14px', textAlign:'center' }}>
                  <div style={{ fontSize:'20px', fontWeight:'800', color:'#FFB347' }}>{'★'.repeat(Math.round(s.avg_rating))}</div>
                  <div style={{ color:'#e2e8f0', fontSize:'12px', fontWeight:'700', marginTop:'4px' }}>{s.spoke_slug}</div>
                  <div style={{ color:'#6b7280', fontSize:'11px' }}>{parseFloat(s.avg_rating).toFixed(1)} avg · {s.count} ratings</div>
                  <button onClick={() => resetRatings(s.spoke_slug)} style={{ marginTop:'8px', padding:'3px 10px', background:'#FF6B6B22', border:'1px solid #FF6B6B44', borderRadius:'6px', color:'#FF6B6B', fontSize:'10px', cursor:'pointer', fontFamily:'inherit' }}>Reset</button>
                </div>
              ))}
            </div>
          )}

          {/* Filter */}
          <div style={{ marginBottom:'16px' }}>
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by spoke slug..." style={{ background:'#111827', border:'1px solid #1e1e2e', borderRadius:'8px', padding:'8px 14px', color:'#e2e8f0', fontSize:'13px', outline:'none', width:'280px' }} />
          </div>

          {/* Ratings table */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #1e1e2e', background:'#111827' }}>
                  {['Spoke','User','Rating','Date','Action'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.ratings || []).map(r => (
                  <tr key={r.id} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                    <td style={{ padding:'10px 16px', color:'#6c63ff' }}>{r.spoke_slug}</td>
                    <td style={{ padding:'10px 16px', color:'#e2e8f0' }}>{r.user_email || 'Anonymous'}</td>
                    <td style={{ padding:'10px 16px', color:'#FFB347' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</td>
                    <td style={{ padding:'10px 16px', color:'#6b7280' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <button onClick={() => deleteRating(r.id)} style={{ padding:'3px 10px', background:'#FF6B6B22', border:'1px solid #FF6B6B44', borderRadius:'6px', color:'#FF6B6B', fontSize:'11px', cursor:'pointer' }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!loading && (data?.ratings || []).length === 0 && (
                  <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#6b7280' }}>No ratings found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(AdminRatings);
