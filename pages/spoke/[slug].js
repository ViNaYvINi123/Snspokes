import { getSpokeMeta } from '../../lib/seo';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import http from '../../lib/http';
import { useSession } from 'next-auth/react';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 10px', background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(108,99,255,0.2)', border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(108,99,255,0.4)'}`, borderRadius: '6px', color: copied ? '#4ade80' : '#8b85ff', fontSize: '11px', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #1e1e2e' }}>
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

export default function SpokePage() {
  const router = useRouter();
  const { slug } = router.query;
  const { data: session } = useSession();
  const [spoke, setSpoke] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [bookmarked,      setBookmarked]      = useState(false);
  const [bookmarkId,      setBookmarkId]      = useState(null);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [rating,          setRating]          = useState(0); // 1=up, -1=down, 0=none
  const [ratingLoading,   setRatingLoading]   = useState(false);
  const [ratingStats,     setRatingStats]     = useState({ upvotes: 0, downvotes: 0 });
  const [error,           setError]           = useState('');

  useEffect(() => {
    if (!slug) return;
    fetchSpoke(slug);
    // Load bookmark state if logged in
    fetch('/api/user/bookmarks')
      .then(r => r.json())
      .then(d => {
        const bm = d.data?.find(b => b.slug === slug || b.spoke_slug === slug);
        if (bm) { setBookmarked(true); setBookmarkId(bm.id); }
      }).catch(() => {});
    // Load rating stats
    fetch(`/api/spoke-rating?slug=${slug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setRatingStats({ upvotes: parseInt(d.upvotes||0), downvotes: parseInt(d.downvotes||0) }); })
      .catch(() => {});
  }, [slug]);

  const toggleBookmark = async () => {
    if (!session?.user?.id) { window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.pathname); return; }
    setBookmarkLoading(true);
    try {
      const method = bookmarked ? 'DELETE' : 'POST';
      const url = bookmarked ? `/api/user/bookmarks?id=${bookmarkId}` : '/api/user/bookmarks';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ spoke_slug: slug }) : undefined,
      });
      setBookmarked(b => !b);
    } catch {}
    setBookmarkLoading(false);
  };

  const submitRating = async (val) => {
    if (!session?.user?.id) { window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.pathname); return; }
    if (ratingLoading) return;
    const newVal = rating === val ? 0 : val; // toggle off if same
    setRatingLoading(true);
    try {
      if (newVal !== 0) {
        const res = await fetch('/api/spoke-rating', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, rating: newVal, user_id: session.user.id }),
        });
        const d = await res.json();
        if (d.success) {
          const prev = rating;
          setRating(newVal);
          setRatingStats(s => ({
            upvotes:   s.upvotes   + (newVal===1?1:0) - (prev===1?1:0),
            downvotes: s.downvotes + (newVal===-1?1:0) - (prev===-1?1:0),
          }));
        }
      } else {
        setRating(0);
      }
    } catch {}
    setRatingLoading(false);
  };

  const fetchSpoke = async (s) => {
    setLoading(true); setError('');
    try {
      const res = await http.post('/api/spoke', { slug: s }, { timeout: 90000 });
      if (res.data?.success && res.data?.spoke) {
        setSpoke(res.data.spoke);
      } else {
        setError(res.data?.error || 'Spoke not found.');
      }
    } catch (err) {
      setError('Failed to load spoke details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!slug || loading) return (
    <>
      <Navbar />
      <div style={{ paddingTop:'80px', minHeight:'100vh', background:'#080810' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'40px 24px' }}>
          {/* Skeleton header */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:'20px', marginBottom:'32px', padding:'24px', background:'#0f0f1a', borderRadius:'16px', border:'1px solid #1e1e2e' }}>
            <div className="skeleton" style={{ width:'64px', height:'64px', borderRadius:'14px', flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div className="skeleton" style={{ width:'40%', height:'24px', marginBottom:'10px' }} />
              <div className="skeleton" style={{ width:'60%', height:'14px', marginBottom:'8px' }} />
              <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
                {[80,60,70].map((w,i) => <div key={i} className="skeleton" style={{ width:`${w}px`, height:'22px', borderRadius:'20px' }} />)}
              </div>
            </div>
          </div>
          {/* Skeleton body */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'24px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ padding:'20px', background:'#0f0f1a', borderRadius:'12px', border:'1px solid #1e1e2e' }}>
                  <div className="skeleton" style={{ width:'30%', height:'16px', marginBottom:'12px' }} />
                  <div className="skeleton" style={{ width:'100%', height:'12px', marginBottom:'6px' }} />
                  <div className="skeleton" style={{ width:'85%', height:'12px', marginBottom:'6px' }} />
                  <div className="skeleton" style={{ width:'70%', height:'12px' }} />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {[1,2].map(i => (
                <div key={i} style={{ padding:'16px', background:'#0f0f1a', borderRadius:'12px', border:'1px solid #1e1e2e' }}>
                  <div className="skeleton" style={{ width:'50%', height:'14px', marginBottom:'10px' }} />
                  <div className="skeleton" style={{ width:'100%', height:'10px', marginBottom:'6px' }} />
                  <div className="skeleton" style={{ width:'80%', height:'10px' }} />
                </div>
              ))}
            </div>
          </div>
          {/* Loading indicator */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', marginTop:'24px', color:'#6b7280', fontSize:'13px' }}>
            <div className="spin" style={{ width:'16px', height:'16px', border:'2px solid #1e1e2e', borderTopColor:'#6c63ff', borderRadius:'50%', flexShrink:0 }} />
            Generating spoke reference...
          </div>
        </div>
      </div>
    </>
  );

  if (error) return (
    <>
      <Navbar />
      <div style={{ paddingTop: '120px', textAlign: 'center', minHeight: '100vh', padding: '120px 24px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ color: '#fff', marginBottom: '12px' }}>Could not load spoke</h2>
        <p style={{ color: '#6b6b8a', marginBottom: '24px' }}>{error}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => fetchSpoke(slug)} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Try Again</button>
          <Link href="/search" style={{ padding: '10px 24px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: '8px', color: '#8b85ff', textDecoration: 'none' }}>← Back to Search</Link>
        </div>
      </div>
      <Footer />
    </>
  );

  if (!spoke) return null;

  const setupSteps = Array.isArray(spoke.setup_steps) ? spoke.setup_steps : [];
  const actions = Array.isArray(spoke.actions) ? spoke.actions : [];
  const commonErrors = Array.isArray(spoke.common_errors) ? spoke.common_errors : [];
  const relatedSpokes = Array.isArray(spoke.related_spokes) ? spoke.related_spokes.filter(Boolean) : [];
  const tags = Array.isArray(spoke.tags) ? spoke.tags : [];
  const hasContent = spoke.ai_description || spoke.official_description || setupSteps.length > 0 || actions.length > 0;

  return (
    <>
      <Head>
        <title>{spoke.name} Spoke — snspokes</title>
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="snspokes" />
        <meta name="description" content={`Complete reference for ServiceNow ${spoke.name} Integration Hub spoke.`} />
      </Head>
      <Navbar />
      <main style={{ paddingTop: '80px', minHeight: '100vh' }}>

        {/* Header */}
        <section style={{ padding: '48px 24px', borderBottom: '1px solid #1e1e2e', background: 'linear-gradient(180deg, rgba(108,99,255,0.05) 0%, transparent 100%)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6b6b8a', textDecoration: 'none', fontSize: '13px', marginBottom: '24px', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#6b6b8a'}
            >← Back to Search</Link>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '16px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 }}>
                {spoke.icon || '🔌'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff' }}>{spoke.name}</h1>
                  {spoke.plugin_id && <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#8b85ff', background: 'rgba(108,99,255,0.08)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(108,99,255,0.2)' }}>{spoke.plugin_id}</code>}
                  {spoke.category && <span style={{ padding: '4px 12px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', fontSize: '12px', color: '#8b85ff' }}>{spoke.category}</span>}
                </div>
                <p style={{ color: '#9999bb', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>{spoke.description}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {tags.map(tag => <span key={tag} style={{ padding: '4px 12px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', fontSize: '12px', color: '#8b85ff', fontWeight: '500' }}>{tag}</span>)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
              <div style={{ padding: '8px 14px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#6b6b8a', fontSize: '13px' }}>📎</span>
                <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#6c63ff' }}>snspokes/{slug}</code>
              </div>
              {/* Bookmark button */}
              <button onClick={toggleBookmark} disabled={bookmarkLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: bookmarked ? 'rgba(108,99,255,0.15)' : 'transparent', border: `1px solid ${bookmarked ? '#6c63ff' : '#1e1e2e'}`, borderRadius: '8px', color: bookmarked ? '#8b85ff' : '#6b6b8a', fontSize: '13px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', transition: 'all 0.15s' }}>
                {bookmarked ? '🔖' : '🔖'} {bookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
              {/* Rating buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => submitRating(1)} disabled={ratingLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: rating === 1 ? 'rgba(74,222,128,0.15)' : 'transparent', border: `1px solid ${rating === 1 ? '#4ade80' : '#1e1e2e'}`, borderRadius: '8px', color: rating === 1 ? '#4ade80' : '#6b6b8a', fontSize: '13px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', transition: 'all 0.15s' }}>
                  👍 {ratingStats.upvotes > 0 && <span>{ratingStats.upvotes}</span>}
                </button>
                <button onClick={() => submitRating(-1)} disabled={ratingLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: rating === -1 ? 'rgba(248,113,113,0.15)' : 'transparent', border: `1px solid ${rating === -1 ? '#f87171' : '#1e1e2e'}`, borderRadius: '8px', color: rating === -1 ? '#f87171' : '#6b6b8a', fontSize: '13px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', transition: 'all 0.15s' }}>
                  👎 {ratingStats.downvotes > 0 && <span>{ratingStats.downvotes}</span>}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section style={{ padding: '48px 24px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px' }} className="content-grid">

              {/* Main */}
              <div>
                {!hasContent && (
                  <div style={{ textAlign: 'center', padding: '48px', background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', marginBottom: '32px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔄</div>
                    <h3 style={{ color: '#fff', marginBottom: '8px' }}>Generating content...</h3>
                    <p style={{ color: '#6b6b8a', marginBottom: '24px' }}>AI is generating detailed content for this spoke. Please refresh in a moment.</p>
                    <button onClick={() => fetchSpoke(slug)} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Refresh</button>
                  </div>
                )}

                {spoke.official_description && (
                  <Section title="Official Description" icon="📖">
                    <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '12px', border: '1px solid #1e1e2e' }}>
                      <p style={{ color: '#9999bb', lineHeight: '1.7', fontSize: '15px' }}>{spoke.official_description}</p>
                    </div>
                  </Section>
                )}

                {spoke.personal_tip && (
                  <Section title="Developer Tip" icon="💡">
                    <div style={{ padding: '20px', background: 'rgba(108,99,255,0.05)', borderRadius: '12px', border: '1px solid rgba(108,99,255,0.2)' }}>
                      <p style={{ color: '#c4c4e0', lineHeight: '1.7', fontSize: '15px' }}>{spoke.personal_tip}</p>
                    </div>
                  </Section>
                )}

                {spoke.ai_description && (
                  <Section title="AI Explanation" icon="🤖">
                    <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '12px', border: '1px solid #1e1e2e' }}>
                      <p style={{ color: '#9999bb', lineHeight: '1.7', fontSize: '15px', whiteSpace: 'pre-wrap' }}>{spoke.ai_description}</p>
                    </div>
                  </Section>
                )}

                {setupSteps.length > 0 && (
                  <Section title="Setup Guide" icon="⚙️">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {setupSteps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px', background: '#0f0f1a', borderRadius: '12px', border: '1px solid #1e1e2e' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(108,99,255,0.2)', border: '1px solid rgba(108,99,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#6c63ff', flexShrink: 0 }}>{i + 1}</div>
                          <p style={{ color: '#9999bb', fontSize: '14px', lineHeight: '1.6', paddingTop: '4px' }}>{typeof step === 'string' ? step : step.title || JSON.stringify(step)}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {actions.length > 0 && (
                  <Section title="Available Actions" icon="⚡">
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {actions.map((action, i) => (
                        <div key={i} style={{ padding: '16px 20px', background: '#0f0f1a', borderRadius: '12px', border: '1px solid #1e1e2e' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                            <span style={{ padding: '2px 8px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '4px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#8b85ff' }}>ACTION</span>
                            <span style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>{typeof action === 'string' ? action : action.name}</span>
                          </div>
                          {action.description && <p style={{ color: '#6b6b8a', fontSize: '13px', lineHeight: '1.5' }}>{action.description}</p>}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {spoke.code_example && (
                  <Section title="Code Example" icon="💻">
                    <div style={{ position: 'relative' }}>
                      <pre style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '16px 48px 16px 16px', fontSize: '13px', lineHeight: '1.6', overflow: 'auto', color: '#a8b2d8', margin: 0 }}>{spoke.code_example}</pre>
                      <CopyBtn text={spoke.code_example} />
                    </div>
                  </Section>
                )}

                {commonErrors.length > 0 && (
                  <Section title="Common Errors & Fixes" icon="🔧">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {commonErrors.map((err, i) => (
                        <div key={i} style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.04)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <p style={{ color: '#f87171', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>⚠️ {typeof err === 'string' ? err : err.error}</p>
                          {err.fix && <p style={{ color: '#9999bb', fontSize: '13px', lineHeight: '1.5' }}>✅ {err.fix}</p>}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>

              {/* Sidebar */}
              <div>
                <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e', marginBottom: '20px', position: 'sticky', top: '84px' }}>
                  <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Attributes</h3>
                  {[
                    { label: 'Plugin ID', value: spoke.plugin_id },
                    { label: 'Credential Type', value: spoke.credential_type },
                    { label: 'Category', value: spoke.category },
                    { label: 'Min Version', value: spoke.min_version || 'Rome+' },
                  ].filter(a => a.value).map(attr => (
                    <div key={attr.label} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #1e1e2e' }}>
                      <div style={{ fontSize: '11px', color: '#6b6b8a', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{attr.label}</div>
                      <div style={{ fontSize: '13px', color: '#c4c4e0', fontFamily: 'JetBrains Mono, monospace' }}>{attr.value}</div>
                    </div>
                  ))}
                  <a href="https://docs.servicenow.com" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6c63ff', fontSize: '13px', textDecoration: 'none', padding: '10px', background: 'rgba(108,99,255,0.08)', borderRadius: '8px', marginTop: '8px', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(108,99,255,0.08)'}
                  >📄 ServiceNow Docs ↗</a>
                </div>

                {relatedSpokes.length > 0 && (
                  <div style={{ padding: '20px', background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e' }}>
                    <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>Related Spokes</h3>
                    {relatedSpokes.map(r => (
                      <Link key={r} href={`/spoke/${r.toLowerCase().replace(/\s+/g, '-')}`} style={{ display: 'block', padding: '10px 12px', borderRadius: '8px', color: '#9999bb', textDecoration: 'none', fontSize: '14px', marginBottom: '4px', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9999bb'; }}
                      >🔌 {r} →</Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <style>{`@media (max-width: 768px) { .content-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
