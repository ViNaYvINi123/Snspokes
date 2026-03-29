import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
        <div>
          <div style={{ fontSize: '80px', marginBottom: '16px' }}>🔌</div>
          <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#fff', marginBottom: '16px' }}>404</h1>
          <p style={{ color: '#6b6b8a', fontSize: '18px', marginBottom: '32px' }}>This spoke page doesn't exist yet.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/search" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', borderRadius: '10px', color: '#fff', textDecoration: 'none', fontWeight: '600' }}>Search Spokes</Link>
            <Link href="/" style={{ padding: '12px 24px', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#9999bb', textDecoration: 'none' }}>Go Home</Link>
          </div>
        </div>
      </div>
    </>
  );
}
