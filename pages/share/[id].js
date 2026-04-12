import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function SharedScript() {
  const router = useRouter();
  const { id } = router.query;
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/share?id=${id}`).then(r => r.json()).then(d => {
      if (d.success) setScript(d.script);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const copy = () => { navigator.clipboard.writeText(script.code); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (loading) return (<><Navbar /><div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Loading...</div></>);
  if (!script) return (<><Navbar /><div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', flexDirection: 'column', gap: '12px', paddingTop: '80px' }}><span style={{ fontSize: '48px' }}>🔍</span><p style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0' }}>Script not found</p><Link href="/" style={{ color: '#6c63ff', fontSize: '14px' }}>Go home →</Link></div></>);

  return (
    <>
      <Head>
        <title>{script.title || 'Shared Script'} — snspokes</title>
        <meta name="description" content={script.description || 'ServiceNow script shared via snspokes'} />
      </Head>
      <Navbar />
      <main style={{ paddingTop: '80px', minHeight: '100vh', padding: '100px 24px 60px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>{script.title || 'Shared Script'}</h1>
              {script.description && <p style={{ color: '#666', fontSize: '14px' }}>{script.description}</p>}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#555' }}>
                <span>👁 {script.view_count} views</span>
                <span>📅 {new Date(script.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <button onClick={copy} style={{ padding: '8px 20px', background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(108,99,255,0.15)', border: '1px solid ' + (copied ? 'rgba(74,222,128,0.25)' : 'rgba(108,99,255,0.25)'), borderRadius: '10px', color: copied ? '#4ade80' : '#8b85ff', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>{copied ? '✓ Copied!' : 'Copy Code'}</button>
          </div>
          <pre style={{ padding: '20px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '14px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.65', color: '#a8b2d8', overflow: 'auto' }}>{script.code}</pre>
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '12px' }}>Shared via snspokes — the ServiceNow developer toolkit</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
              <a href={'https://twitter.com/intent/tweet?text=' + encodeURIComponent((script.title || 'ServiceNow script') + ' — shared via snspokes') + '&url=' + encodeURIComponent('https://snspokes.com/share/' + id)} target="_blank" rel="noopener" style={{ padding: '8px 16px', background: 'rgba(29,161,242,0.1)', border: '1px solid rgba(29,161,242,0.2)', borderRadius: '8px', color: '#1da1f2', fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>Share on X</a>
              <a href={'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent('https://snspokes.com/share/' + id)} target="_blank" rel="noopener" style={{ padding: '8px 16px', background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.2)', borderRadius: '8px', color: '#0a66c2', fontSize: '12px', textDecoration: 'none', fontWeight: '600' }}>Share on LinkedIn</a>
            </div>
            <Link href="/tools/snippets" style={{ color: '#6c63ff', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>Browse more snippets →</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export const dynamic = 'force-dynamic';
