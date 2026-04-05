import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

// ── Shared styles ──────────────────────────────────────────
const S = {
  card:     { background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'16px', padding:'24px' },
  cardSm:   { background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'16px' },
  btn:      { padding:'8px 18px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' },
  btnGhost: { padding:'7px 16px', background:'transparent', border:'1px solid #2a2a3e', borderRadius:'10px', color:'#9999bb', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' },
  input:    { width:'100%', background:'#111827', border:'1px solid #1e1e2e', borderRadius:'10px', padding:'10px 14px', color:'#e2e8f0', fontSize:'13px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
  label:    { fontSize:'11px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'4px' },
};

const PLAN_COLORS = { free:'#6b7280', pro:'#6c63ff', enterprise:'#f59e0b' };

export default function Dashboard() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [tab, setTab]   = useState(router.query.tab || 'overview');
  const [data, setData] = useState({ savedQueries:[], codeHistory:[], bookmarks:[], apiKeys:[], usage:null, referral:null });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Redirect unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=/dashboard');
  }, [status]);

  // Handle banned users
  useEffect(() => {
    if (session?.error === 'BannedUser') {
      signOut({ callbackUrl: '/login?error=banned' });
    }
  }, [session]);

  // Redirect to onboarding if not done yet
  useEffect(() => {
    if (session?.user && session.user.onboarded === false && router.pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [session]);

  useEffect(() => {
    if (router.query.tab) setTab(router.query.tab);
  }, [router.query.tab]);

  useEffect(() => {
    if (session?.user && session.user.onboarded !== false) fetchAll();
  }, [session]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sq, ch, bm, ak, us, rf] = await Promise.all([
        fetch('/api/user/saved-queries').then(r => r.json()).catch(() => ({ data:[] })),
        fetch('/api/user/code-history').then(r => r.json()).catch(() => ({ data:[] })),
        fetch('/api/user/bookmarks').then(r => r.json()).catch(() => ({ data:[] })),
        fetch('/api/user/api-keys').then(r => r.json()).catch(() => ({ data:[] })),
        fetch('/api/user/usage').then(r => r.json()).catch(() => null),
        fetch('/api/referral').then(r => r.json()).catch(() => null),
      ]);
      setData({
        savedQueries: sq.data || [],
        codeHistory:  ch.data || [],
        bookmarks:    bm.data || [],
        apiKeys:      ak.data || [],
        usage:        us,      // shape: { success, plan, searches:{today,limit,remaining}, ai_generations:{...} }
        referral:     rf,
      });
    } catch {}
    setLoading(false);
  }, [session]);

  if (status === 'loading') return <LoadingScreen msg="Loading..." />;
  if (status === 'unauthenticated') return <LoadingScreen msg="Redirecting..." />;

  const plan = session?.user?.plan || 'free';
  const planColor = PLAN_COLORS[plan] || '#6b7280';

  const TABS = [
    { id:'overview',  label:'📊 Overview' },
    { id:'queries',   label:'🔍 Saved Queries', count: data.savedQueries.length },
    { id:'code',      label:'💻 Code History',  count: data.codeHistory.length },
    { id:'bookmarks', label:'🔖 Bookmarks',     count: data.bookmarks.length },
    { id:'apikeys',   label:'🔑 API Keys' },
    { id:'referral',  label:'🎁 Referrals' },
    { id:'billing',   label:'💳 Billing' },
  ];

  const switchTab = (id) => {
    setTab(id);
    router.push(`/dashboard?tab=${id}`, undefined, { shallow: true });
  };

  return (
    <>
      <Head>
        <title>Dashboard — snspokes</title>
        <meta name="description" content="Your snspokes dashboard — searches, code history, bookmarks, API keys" />
      </Head>
      <Navbar />

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:'80px', right:'24px', zIndex:9999, padding:'12px 20px', background: toast.type==='success'?'#052e16':'#2d0a0a', border:`1px solid ${toast.type==='success'?'#16a34a':'#dc2626'}`, borderRadius:'12px', color: toast.type==='success'?'#4ade80':'#f87171', fontSize:'13px', fontWeight:'500', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', backdropFilter:'blur(12px)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#e2e8f0', paddingTop:'80px', paddingBottom:'60px', fontFamily:"system-ui, -apple-system, sans-serif" }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'40px 24px 0' }}>

          {/* Header */}
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'16px', marginBottom:'32px' }}>
            <div>
              <h1 style={{ fontSize:'28px', fontWeight:'800', color:'#fff', margin:0, letterSpacing:'-0.03em' }}>My Dashboard</h1>
              <p style={{ color:'#6b7280', marginTop:'4px', fontSize:'14px' }}>Welcome back, {session?.user?.name?.split(' ')[0] || 'Developer'} 👋</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              {data.usage && (
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'11px', color:'#6b7280' }}>AI today</div>
                  <div style={{ fontSize:'13px', fontWeight:'700', color:'#fff' }}>
                    {data.usage.ai_generations?.today || 0} / {data.usage.ai_generations?.limit === 99999 ? '∞' : data.usage.ai_generations?.limit}
                  </div>
                </div>
              )}
              <span style={{ background:`${planColor}22`, color:planColor, border:`1px solid ${planColor}44`, padding:'4px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                {plan}
              </span>
              <button onClick={() => { fetchAll(); showToast('Refreshed!'); }} style={S.btnGhost} title="Refresh data">🔄</button>
            </div>
          </div>

          {/* Usage bars */}
          {data.usage && <UsageBars usage={data.usage} plan={plan} />}

          {/* Tabs */}
          <div style={{ display:'flex', gap:'2px', marginBottom:'28px', borderBottom:'1px solid #1e1e2e', overflowX:'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => switchTab(t.id)}
                style={{ padding:'10px 16px', background:'transparent', border:'none', borderBottom:`2px solid ${tab===t.id?'#6c63ff':'transparent'}`, color:tab===t.id?'#fff':'#6b7280', fontSize:'13px', fontWeight:tab===t.id?600:400, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'6px', transition:'color 0.15s' }}>
                {t.label}
                {t.count > 0 && <span style={{ background:'#1e1e2e', color:'#9999bb', fontSize:'10px', padding:'1px 6px', borderRadius:'20px' }}>{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {loading ? <LoadingContent /> : (
            <>
              {tab === 'overview'  && <OverviewTab  data={data} plan={plan} planColor={planColor} switchTab={switchTab} />}
              {tab === 'queries'   && <QueriesTab   items={data.savedQueries} onDelete={async id => { await fetch(`/api/user/saved-queries?id=${id}`, { method:'DELETE' }); fetchAll(); showToast('Query deleted'); }} />}
              {tab === 'code'      && <CodeTab      items={data.codeHistory} showToast={showToast} />}
              {tab === 'bookmarks' && <BookmarksTab items={data.bookmarks} onRemove={async id => { await fetch(`/api/user/bookmarks?id=${id}`, { method:'DELETE' }); fetchAll(); showToast('Removed'); }} />}
              {tab === 'apikeys'   && <ApiKeysTab   apiKeys={data.apiKeys} plan={plan} onRefresh={fetchAll} showToast={showToast} />}
              {tab === 'referral'  && <ReferralTab  referral={data.referral} />}
              {tab === 'billing'   && <BillingTab   plan={plan} session={session} showToast={showToast} updateSession={updateSession} />}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

// ── Loading states ─────────────────────────────────────────
function LoadingScreen({ msg }) {
  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'16px' }}>
      <div style={{ width:'40px', height:'40px', borderRadius:'50%', border:'3px solid #1e1e2e', borderTopColor:'#6c63ff', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#6b7280', fontSize:'14px', fontFamily:'system-ui' }}>{msg}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LoadingContent() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' }}>
      {[...Array(4)].map((_,i) => (
        <div key={i} style={{ background:'linear-gradient(90deg,#1a1a2e 25%,#252540 50%,#1a1a2e 75%)', backgroundSize:'200% 100%', height:'100px', borderRadius:'12px', animation:'shimmer 1.5s infinite' }} />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
    </div>
  );
}

// ── Usage Bars ─────────────────────────────────────────────
function UsageBars({ usage, plan }) {
  // usage shape: { plan, searches:{today,limit,remaining}, ai_generations:{today,limit,remaining} }
  const searches   = usage.searches   || {};
  const aiGens     = usage.ai_generations || {};
  const searchPct  = searches.limit  === 99999 ? 0 : Math.min(100, Math.round(((searches.today||0)   / Math.max(searches.limit||1, 1))   * 100));
  const aiPct      = aiGens.limit    === 99999 ? 0 : Math.min(100, Math.round(((aiGens.today||0)     / Math.max(aiGens.limit||1, 1))     * 100));
  const nearLimit  = searchPct >= 80 || aiPct >= 80;

  return (
    <div style={{ ...S.card, marginBottom:'24px', padding:'20px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
        <Bar label="Searches today" today={searches.today||0} limit={searches.limit||0} pct={searchPct} color="#6c63ff" />
        <Bar label="AI generations today" today={aiGens.today||0} limit={aiGens.limit||0} pct={aiPct} color="#a855f7" />
      </div>
      {nearLimit && plan === 'free' && (
        <div style={{ marginTop:'14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#1f1400', border:'1px solid #d9770622', borderRadius:'10px', padding:'10px 14px' }}>
          <span style={{ color:'#fbbf24', fontSize:'13px' }}>⚠️ Approaching daily limit</span>
          <Link href="/pricing" style={{ color:'#fbbf24', fontSize:'12px', fontWeight:'600', textDecoration:'underline' }}>Upgrade for more →</Link>
        </div>
      )}
    </div>
  );
}

function Bar({ label, today, limit, pct, color }) {
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : color;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
        <span style={{ color:'#6b7280' }}>{label}</span>
        <span style={{ color:'#fff', fontWeight:'600' }}>{today} / {limit === 99999 ? '∞' : limit}</span>
      </div>
      <div style={{ background:'#1e1e2e', borderRadius:'4px', height:'6px', overflow:'hidden' }}>
        <div style={{ width:`${limit===99999?0:pct}%`, height:'100%', background:barColor, borderRadius:'4px', transition:'width 0.5s ease' }} />
      </div>
      {limit !== 99999 && <div style={{ fontSize:'11px', color:'#4b4b6a', marginTop:'3px' }}>{limit - today > 0 ? `${limit - today} remaining` : 'Limit reached'}</div>}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────
function OverviewTab({ data, plan, planColor, switchTab }) {
  const stats = [
    { label:'Saved Queries', count: data.savedQueries.length, icon:'🔍', color:'#6c63ff', tab:'queries' },
    { label:'Code Generated', count: data.codeHistory.length, icon:'💻', color:'#00D4AA', tab:'code' },
    { label:'Bookmarks',      count: data.bookmarks.length,   icon:'🔖', color:'#FFB347', tab:'bookmarks' },
    { label:'Referrals',      count: data.referral?.stats?.total || 0, icon:'🎁', color:'#f472b6', tab:'referral' },
  ];
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'14px', marginBottom:'24px' }}>
        {stats.map(s => (
          <button key={s.label} onClick={() => switchTab(s.tab)} style={{ ...S.cardSm, border:`1px solid ${s.color}22`, cursor:'pointer', textAlign:'left', transition:'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '66'}
            onMouseLeave={e => e.currentTarget.style.borderColor = s.color + '22'}>
            <div style={{ fontSize:'28px', marginBottom:'8px' }}>{s.icon}</div>
            <div style={{ fontSize:'28px', fontWeight:'800', color:s.color, marginBottom:'4px' }}>{s.count}</div>
            <div style={{ fontSize:'12px', color:'#6b7280' }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Quick tools */}
      <div style={{ ...S.card, marginBottom:'20px' }}>
        <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 16px' }}>⚡ Quick Access</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'10px' }}>
          {[
            { href:'/tools/code-generator', icon:'💻', label:'Code Generator' },
            { href:'/tools/query-builder',  icon:'📊', label:'Query Builder' },
            { href:'/tools/error-finder',   icon:'🐛', label:'Error Finder' },
            { href:'/tools/script-linter',  icon:'✅', label:'Script Linter' },
            { href:'/tools/version-matrix', icon:'🔖', label:'Version Matrix' },
            { href:'/search',               icon:'🔍', label:'Search Spokes' },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', background:'#111827', borderRadius:'10px', textDecoration:'none', color:'#9999bb', fontSize:'13px', transition:'all 0.15s', border:'1px solid transparent' }}
              onMouseEnter={e => { e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#2a2a3e'; }}
              onMouseLeave={e => { e.currentTarget.style.color='#9999bb'; e.currentTarget.style.borderColor='transparent'; }}>
              <span style={{ fontSize:'18px' }}>{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Upgrade banner for free users */}
      {plan === 'free' && (
        <div style={{ background:'linear-gradient(135deg,#6c63ff15,#a855f715)', border:'1px solid #6c63ff33', borderRadius:'16px', padding:'24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }}>
          <div>
            <h3 style={{ color:'#fff', fontSize:'16px', fontWeight:'700', margin:'0 0 6px' }}>Upgrade to Pro 🚀</h3>
            <p style={{ color:'#9999bb', fontSize:'13px', margin:0 }}>Unlimited searches · 100 AI/day · API access · Priority support</p>
          </div>
          <Link href="/pricing" style={{ padding:'10px 22px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', borderRadius:'10px', color:'#fff', textDecoration:'none', fontSize:'13px', fontWeight:'600', whiteSpace:'nowrap' }}>
            See Plans →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Queries Tab ────────────────────────────────────────────
function QueriesTab({ items, onDelete }) {
  if (!items.length) return <EmptyState msg="No saved queries yet" link="/tools/query-builder" cta="Open Query Builder" />;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
      {items.map(q => (
        <div key={q.id} style={{ ...S.cardSm, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'#fff', fontWeight:'600', fontSize:'14px', marginBottom:'4px' }}>{q.name || 'Untitled Query'}</div>
            <code style={{ color:'#6c63ff', fontSize:'11px', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.query}</code>
            <div style={{ display:'flex', gap:'12px', marginTop:'4px', fontSize:'11px', color:'#4b4b6a' }}>
              <span>Table: {q.table_name || 'unknown'}</span>
              <span>{new Date(q.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
            <Link href={`/tools/query-builder?q=${encodeURIComponent(q.query)}&table=${q.table_name || ''}`}
              style={{ padding:'5px 12px', background:'#6c63ff22', border:'1px solid #6c63ff44', borderRadius:'8px', color:'#8b85ff', fontSize:'12px', textDecoration:'none' }}>Use</Link>
            <button onClick={() => onDelete(q.id)} style={{ padding:'5px 12px', background:'#FF6B6B11', border:'1px solid #FF6B6B33', borderRadius:'8px', color:'#f87171', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Code Tab ───────────────────────────────────────────────
function CodeTab({ items, showToast }) {
  const [expanded, setExpanded] = useState(null);
  if (!items.length) return <EmptyState msg="No code generated yet" link="/tools/code-generator" cta="Open Code Generator" />;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
      {items.map(c => (
        <div key={c.id} style={{ ...S.cardSm, padding:0, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', cursor:'pointer' }} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
              <span style={{ background:'#6c63ff22', color:'#8b85ff', padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', flexShrink:0 }}>{c.code_type}</span>
              <span style={{ color:'#9999bb', fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.prompt}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0, marginLeft:'12px' }}>
              <span style={{ color:'#4b4b6a', fontSize:'11px' }}>{new Date(c.created_at).toLocaleDateString()}</span>
              <span style={{ color:'#4b4b6a', fontSize:'12px' }}>{expanded === c.id ? '▲' : '▼'}</span>
            </div>
          </div>
          {expanded === c.id && (
            <div style={{ borderTop:'1px solid #1e1e2e', padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                <span style={{ fontSize:'11px', color:'#6b7280' }}>Generated code</span>
                <button onClick={() => { navigator.clipboard.writeText(c.generated || ''); showToast('Copied!'); }} style={{ fontSize:'11px', color:'#6c63ff', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>📋 Copy</button>
              </div>
              <pre style={{ background:'#080810', borderRadius:'8px', padding:'14px', fontSize:'12px', color:'#e2e8f0', overflow:'auto', maxHeight:'280px', lineHeight:'1.5', margin:0 }}>{c.generated}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Bookmarks Tab ──────────────────────────────────────────
function BookmarksTab({ items, onRemove }) {
  if (!items.length) return <EmptyState msg="No bookmarks yet" link="/spokes" cta="Browse Spokes" />;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px' }}>
      {items.map(b => (
        <div key={b.id} style={{ ...S.cardSm, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ minWidth:0 }}>
            <Link href={`/spoke/${b.slug || b.spoke_slug}`} style={{ color:'#e2e8f0', fontWeight:'600', fontSize:'14px', textDecoration:'none' }}
              onMouseEnter={e => e.target.style.color='#8b85ff'}
              onMouseLeave={e => e.target.style.color='#e2e8f0'}>
              {b.name || b.spoke_slug}
            </Link>
            <div style={{ fontSize:'11px', color:'#4b4b6a', marginTop:'2px' }}>
              {b.category}{b.min_version ? ` · min ${b.min_version}` : ''}
            </div>
          </div>
          <button onClick={() => onRemove(b.id)} style={{ color:'#4b4b6a', background:'none', border:'none', cursor:'pointer', fontSize:'16px', padding:'4px', lineHeight:1 }}
            onMouseEnter={e => e.target.style.color='#f87171'}
            onMouseLeave={e => e.target.style.color='#4b4b6a'}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── API Keys Tab ───────────────────────────────────────────
function ApiKeysTab({ apiKeys, plan, onRefresh, showToast }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);

  if (plan === 'free') return (
    <div style={{ textAlign:'center', padding:'60px 24px' }}>
      <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔒</div>
      <h3 style={{ color:'#fff', fontSize:'20px', fontWeight:'800', marginBottom:'8px' }}>API Keys require Pro</h3>
      <p style={{ color:'#6b7280', marginBottom:'24px', fontSize:'14px' }}>Access snspokes programmatically — search spokes, generate code, and more.</p>
      <Link href="/pricing" style={{ ...S.btn, textDecoration:'none', display:'inline-block' }}>Upgrade to Pro →</Link>
    </div>
  );

  const create = async () => {
    if (!name.trim()) return showToast('Enter a key name', 'error');
    setCreating(true);
    const r = await fetch('/api/user/api-keys', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ name }) });
    const d = await r.json();
    if (d.success) { setNewKey(d.key); setName(''); onRefresh(); showToast('API key created!'); }
    else showToast(d.error || 'Failed', 'error');
    setCreating(false);
  };

  const deleteKey = async (id) => {
    if (!confirm('Delete this API key? This cannot be undone.')) return;
    await fetch(`/api/user/api-keys?id=${id}`, { method:'DELETE' });
    onRefresh(); showToast('Key deleted');
  };

  return (
    <div style={{ maxWidth:'680px' }}>
      {/* New key banner */}
      {newKey && (
        <div style={{ background:'#052e16', border:'1px solid #16a34a', borderRadius:'12px', padding:'16px', marginBottom:'20px' }}>
          <p style={{ color:'#4ade80', fontSize:'13px', fontWeight:'600', marginBottom:'10px' }}>✅ New key created — copy it now, it will never be shown again!</p>
          <div style={{ display:'flex', gap:'8px' }}>
            <code style={{ flex:1, background:'#080810', color:'#4ade80', fontSize:'12px', padding:'10px 12px', borderRadius:'8px', overflow:'auto', display:'block' }}>{newKey}</code>
            <button onClick={() => { navigator.clipboard.writeText(newKey); showToast('Copied!'); }} style={{ ...S.btn, background:'#16a34a', whiteSpace:'nowrap' }}>Copy</button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'20px' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Key name (e.g. My Integration)" onKeyDown={e => e.key==='Enter' && create()} style={{ ...S.input }} />
        <button onClick={create} disabled={creating} style={{ ...S.btn, whiteSpace:'nowrap', opacity: creating ? 0.6 : 1 }}>{creating ? '...' : '+ Create Key'}</button>
      </div>

      {/* Keys list */}
      {apiKeys.length === 0 ? (
        <p style={{ color:'#6b7280', fontSize:'13px', textAlign:'center', padding:'32px' }}>No API keys yet.</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>
          {apiKeys.map(k => (
            <div key={k.id} style={{ ...S.cardSm, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ color:'#fff', fontWeight:'600', fontSize:'14px' }}>{k.name}</div>
                <code style={{ color:'#6b7280', fontSize:'11px' }}>{k.key_prefix}••••••••••••••••••••</code>
                <div style={{ fontSize:'11px', color:'#4b4b6a', marginTop:'2px' }}>Created {new Date(k.created_at).toLocaleDateString()} · Last used: {k.last_used ? new Date(k.last_used).toLocaleDateString() : 'Never'}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'11px', padding:'3px 10px', borderRadius:'20px', background: k.is_active?'#052e16':'#1e1e2e', color: k.is_active?'#4ade80':'#6b7280' }}>
                  {k.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => deleteKey(k.id)} style={{ background:'none', border:'none', color:'#4b4b6a', cursor:'pointer', fontSize:'16px', padding:'4px' }}
                  onMouseEnter={e => e.target.style.color='#f87171'}
                  onMouseLeave={e => e.target.style.color='#4b4b6a'}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage example */}
      <div style={{ ...S.cardSm, background:'#080810' }}>
        <p style={{ color:'#6b7280', fontSize:'12px', marginBottom:'8px' }}>Usage example:</p>
        <pre style={{ fontSize:'12px', color:'#9999bb', margin:0, overflow:'auto' }}>{`curl https://snspokes.com/api/search?q=slack \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
      </div>
    </div>
  );
}

// ── Referral Tab ───────────────────────────────────────────
function ReferralTab({ referral }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!referral?.referral_url) return;
    navigator.clipboard.writeText(referral.referral_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth:'640px' }}>
      <div style={{ background:'linear-gradient(135deg,#6c63ff15,#a855f715)', border:'1px solid #6c63ff33', borderRadius:'20px', padding:'32px', textAlign:'center', marginBottom:'24px' }}>
        <div style={{ fontSize:'48px', marginBottom:'12px' }}>🎁</div>
        <h2 style={{ color:'#fff', fontSize:'22px', fontWeight:'800', margin:'0 0 10px' }}>Refer a developer</h2>
        <p style={{ color:'#9999bb', fontSize:'14px', lineHeight:'1.6', margin:0 }}>
          Share your link. When they upgrade to Pro —{' '}
          <strong style={{ color:'#a78bfa' }}>you both get 1 free month.</strong>
        </p>
      </div>

      {referral ? (
        <>
          <div style={{ ...S.card, marginBottom:'16px' }}>
            <label style={S.label}>Your referral link</label>
            <div style={{ display:'flex', gap:'8px', marginTop:'6px' }}>
              <input readOnly value={referral.referral_url || ''} style={{ ...S.input }} />
              <button onClick={copy} style={{ ...S.btn, background: copied ? '#16a34a' : 'linear-gradient(135deg,#6c63ff,#a855f7)', whiteSpace:'nowrap' }}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
            {[
              { label:'Total referrals',   value: referral.stats?.total || 0,     icon:'👥' },
              { label:'Converted (paid)',  value: referral.stats?.converted || 0, icon:'💰' },
              { label:'Free months earned',value: referral.months_earned || 0,    icon:'🎉' },
            ].map(s => (
              <div key={s.label} style={{ ...S.cardSm, textAlign:'center' }}>
                <div style={{ fontSize:'28px', marginBottom:'6px' }}>{s.icon}</div>
                <div style={{ fontSize:'24px', fontWeight:'800', color:'#fff' }}>{s.value}</div>
                <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      ) : <div style={{ textAlign:'center', color:'#6b7280', padding:'40px' }}>Loading referral info...</div>}
    </div>
  );
}

// ── Billing Tab ────────────────────────────────────────────
function BillingTab({ plan, session, showToast, updateSession }) {
  const [loading, setLoading] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const PLANS = [
    { id:'free',       name:'Free',       price:0,    features:['50 searches/day','10 AI/day','Community support'] },
    { id:'pro',        name:'Pro',        price:999,  features:['Unlimited searches','100 AI/day','API access','Priority support'] },
    { id:'enterprise', name:'Enterprise', price:4999, features:['Everything in Pro','Team seats','SLA','Dedicated support'] },
  ];

  const subscribe = async (planId) => {
    setLoading(planId);
    try {
      const r = await fetch('/api/payment', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ action:'create_subscription', plan_id: planId }) });
      const d = await r.json();
      if (d.checkout_url) window.location.href = d.checkout_url;
      else showToast(d.error || 'Payment setup failed', 'error');
    } catch { showToast('Payment setup failed', 'error'); }
    setLoading(null);
  };

  const cancel = async () => {
    if (!confirm('Cancel your subscription? You will keep access until the end of your billing period.')) return;
    setCancelling(true);
    try {
      const r = await fetch('/api/payment', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ action:'cancel' }) });
      const d = await r.json();
      if (d.success) {
        showToast('Subscription cancelled. Access continues until billing period ends.');
        // Refresh session to get updated plan
        await updateSession({ plan: 'free' });
      } else {
        showToast(d.error || 'Cancellation failed', 'error');
      }
    } catch { showToast('Failed', 'error'); }
    setCancelling(false);
  };

  return (
    <div>
      {/* Current plan status */}
      <div style={{ ...S.card, marginBottom:'24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <div style={{ fontSize:'12px', color:'#6b7280', marginBottom:'4px' }}>Current plan</div>
          <div style={{ fontSize:'22px', fontWeight:'800', color:'#fff', textTransform:'uppercase', letterSpacing:'0.03em' }}>{plan}</div>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          {plan !== 'free' && (
            <button onClick={cancel} disabled={cancelling} style={{ ...S.btnGhost, color:'#f87171', borderColor:'#f8717133', opacity: cancelling ? 0.6 : 1 }}>
              {cancelling ? 'Cancelling...' : 'Cancel subscription'}
            </button>
          )}
          <Link href="/pricing" style={{ ...S.btnGhost, textDecoration:'none' }}>View all plans</Link>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))', gap:'16px' }}>
        {PLANS.map(p => (
          <div key={p.id} style={{ ...S.card, border: p.id==='pro' ? '1px solid #6c63ff' : '1px solid #1e1e2e', boxShadow: p.id==='pro' ? '0 0 24px #6c63ff18' : 'none' }}>
            {p.id === 'pro' && <div style={{ fontSize:'11px', color:'#6c63ff', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px' }}>Most Popular</div>}
            <div style={{ fontSize:'18px', fontWeight:'800', color:'#fff', marginBottom:'4px' }}>{p.name}</div>
            <div style={{ fontSize:'26px', fontWeight:'800', color: PLAN_COLORS[p.id]||'#6b7280', marginBottom:'16px' }}>
              {p.price === 0 ? 'Free' : `₹${p.price}`}
              {p.price > 0 && <span style={{ fontSize:'14px', color:'#6b7280', fontWeight:'400' }}>/mo</span>}
            </div>
            <ul style={{ listStyle:'none', padding:0, margin:'0 0 20px' }}>
              {p.features.map(f => (
                <li key={f} style={{ display:'flex', gap:'8px', alignItems:'flex-start', marginBottom:'8px', color:'#9999bb', fontSize:'13px' }}>
                  <span style={{ color:'#4ade80', flexShrink:0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            {plan === p.id
              ? <div style={{ textAlign:'center', color:'#6b7280', fontSize:'13px', padding:'10px', border:'1px solid #1e1e2e', borderRadius:'10px' }}>Current Plan</div>
              : p.id === 'free'
              ? null
              : <button onClick={() => subscribe(p.id)} disabled={!!loading} style={{ ...S.btn, width:'100%', opacity: loading ? 0.7 : 1, background: p.id==='enterprise'?'linear-gradient(135deg,#f59e0b,#d97706)':'linear-gradient(135deg,#6c63ff,#a855f7)' }}>
                  {loading === p.id ? 'Redirecting...' : `Upgrade to ${p.name}`}
                </button>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────
function EmptyState({ msg, link, cta }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 24px' }}>
      <div style={{ fontSize:'48px', marginBottom:'16px' }}>📭</div>
      <p style={{ color:'#6b7280', fontSize:'14px', marginBottom:'20px' }}>{msg}</p>
      <Link href={link} style={{ ...S.btn, textDecoration:'none', display:'inline-block' }}>{cta}</Link>
    </div>
  );
}
