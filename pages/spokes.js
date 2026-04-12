import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import http from '../lib/http';
import { SpokeCardSkeleton } from '../components/Skeleton';

const CATEGORIES = ['All', 'Communication', 'DevOps', 'Cloud', 'ITSM', 'Security', 'HR', 'CRM'];

export default function Spokes() {
  const [spokes, setSpokes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchSpokes(); }, []);
  useEffect(() => {
    let r = spokes;
    if (category !== 'All') r = r.filter(s => s.category === category);
    if (search) r = r.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(r);
  }, [spokes, category, search]);

  const fetchSpokes = async () => {
    try {
      const res = await http.get('/api/spokes', { params: { category: category !== 'All' ? category : '' }, timeout: 10000 });
      if (res.data.success) { setSpokes(res.data.spokes || []); setFiltered(res.data.spokes || []); }
      else setError('Failed to load spokes.');
    } catch { setError('Unable to load spokes. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Head>
        <title>All Spokes — snspokes</title>
        <meta name="description" content="Browse all ServiceNow Integration Hub spokes." />
      </Head>
      <Navbar />
      <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <section style={{ padding: '60px 24px 40px', borderBottom: '1px solid #1e1e2e', background: 'linear-gradient(180deg, rgba(108,99,255,0.04) 0%, transparent 100%)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '40px', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>All Spokes</h1>
            <p style={{ color: '#6b6b8a', fontSize: '16px', marginBottom: '32px' }}>Complete reference for all ServiceNow Integration Hub spokes</p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Filter spokes..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '12px 16px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: 'Syne, sans-serif' }} />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: 'Syne, sans-serif', background: category === cat ? 'rgba(108,99,255,0.2)' : 'transparent', border: `1px solid ${category === cat ? '#6c63ff' : '#1e1e2e'}`, color: category === cat ? '#8b85ff' : '#6b6b8a', transition: 'all 0.2s' }}>{cat}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '40px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {loading && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'16px' }}>
                {[...Array(9)].map((_,i) => <SpokeCardSkeleton key={i} />)}
              </div>
            )}
            {error && !loading && <div style={{ padding: '20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#f87171', marginBottom: '24px' }}>⚠️ {error}</div>}
            {!loading && !error && (
              <>
                <p style={{ color: '#6b6b8a', fontSize: '14px', marginBottom: '24px' }}>Showing <span style={{ color: '#fff' }}>{filtered.length}</span> spokes</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {filtered.map(spoke => (
                    <Link key={spoke.slug} href={`/spoke/${spoke.slug}`} style={{ textDecoration: 'none' }}>
                      <div className="card-hover" style={{ padding: '20px', borderRadius: '14px', background: '#0f0f1a', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{spoke.icon || '🔌'}</div>
                          <div>
                            <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>{spoke.name}</h3>
                            <span style={{ fontSize: '11px', color: '#6b6b8a' }}>{spoke.category}</span>
                          </div>
                        </div>
                        <p style={{ color: '#9999bb', fontSize: '13px', lineHeight: '1.5' }}>{spoke.description?.substring(0, 100)}{spoke.description?.length > 100 ? '...' : ''}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              <div style={{display:'none'}} className='empty-state'>No spokes found</div></>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export const dynamic = 'force-dynamic';
