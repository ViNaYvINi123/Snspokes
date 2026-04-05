import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';

const TOOLS = [
  { href: '/tools/code-generator', icon: '💻', label: 'Code Generator',  desc: 'AI-powered SN code' },
  { href: '/tools/script-linter',  icon: '✅', label: 'Script Linter',   desc: '15 lint rules + AI' },
  { href: '/tools/error-finder',   icon: '🐛', label: 'Error Finder',    desc: 'AI error analysis' },
  { href: '/tools/query-builder',  icon: '📊', label: 'Query Builder',   desc: 'Visual GlideRecord' },
  { href: '/tools/version-matrix', icon: '🔖', label: 'Version Matrix',  desc: 'SN compatibility' },
  { href: '/tools/snippets',       icon: '📋', label: 'Snippets',        desc: 'Copy-paste templates' },
  { href: '/tools/cheatsheet',     icon: '📖', label: 'Cheatsheet',      desc: 'Quick reference' },
];

const NAV_LINKS = [
  { href: '/spokes',  label: 'Spokes' },
  { href: '/search',  label: 'Search' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/docs',    label: 'Docs' },
];

export default function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const [toolsOpen,  setToolsOpen]  = useState(false);
  const [userOpen,   setUserOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toolsRef = useRef(null);
  const userRef  = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [router.pathname]);

  const isActive = (href) => router.pathname === href || router.pathname.startsWith(href + '/');

  return (
    <>
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, borderBottom:'1px solid #1e1e2e', background:'rgba(8,8,16,0.92)', backdropFilter:'blur(16px)' }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:'64px' }}>

            {/* Logo */}
            <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
              <img src="/logo.svg" alt="snspokes" height="32" style={{ borderRadius:'8px' }} />
            </Link>

            {/* Desktop nav */}
            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
              {NAV_LINKS.map(l => (
                <Link key={l.href} href={l.href}
                  style={{ textDecoration:'none', color:isActive(l.href)?'#fff':'#9999bb', fontSize:'14px', fontWeight:isActive(l.href)?600:500, padding:'6px 12px', borderRadius:'8px', background:isActive(l.href)?'rgba(108,99,255,0.12)':'transparent', transition:'all 0.15s' }}
                  onMouseEnter={e => { if (!isActive(l.href)) { e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}}
                  onMouseLeave={e => { if (!isActive(l.href)) { e.currentTarget.style.color='#9999bb'; e.currentTarget.style.background='transparent'; }}}
                >{l.label}</Link>
              ))}

              {/* Tools dropdown */}
              <div ref={toolsRef} style={{ position:'relative' }}>
                <button onClick={() => setToolsOpen(o => !o)}
                  style={{ display:'flex', alignItems:'center', gap:'6px', color:router.pathname.startsWith('/tools')?'#fff':'#9999bb', fontSize:'14px', fontWeight:router.pathname.startsWith('/tools')?600:500, padding:'6px 12px', borderRadius:'8px', background:router.pathname.startsWith('/tools')||toolsOpen?'rgba(108,99,255,0.12)':'transparent', border:'none', cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit' }}>
                  Tools
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform:toolsOpen?'rotate(180deg)':'none', transition:'transform 0.2s' }}>
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {toolsOpen && (
                  <div style={{ position:'absolute', top:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)', width:'280px', background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'14px', padding:'8px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', zIndex:200 }}>
                    <div style={{ padding:'8px 12px 6px', fontSize:'10px', fontWeight:'700', color:'#4b4b6a', letterSpacing:'0.08em', textTransform:'uppercase' }}>Developer Tools</div>
                    {TOOLS.map(t => (
                      <Link key={t.href} href={t.href}
                        style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', borderRadius:'10px', textDecoration:'none', transition:'background 0.15s', background:router.pathname===t.href?'rgba(108,99,255,0.12)':'transparent' }}
                        onMouseEnter={e => { if(router.pathname!==t.href) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if(router.pathname!==t.href) e.currentTarget.style.background='transparent'; }}>
                        <span style={{ fontSize:'20px', width:'28px', textAlign:'center' }}>{t.icon}</span>
                        <div>
                          <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'600' }}>{t.label}</div>
                          <div style={{ color:'#6b6b8a', fontSize:'11px', marginTop:'1px' }}>{t.desc}</div>
                        </div>
                      </Link>
                    ))}
                    <div style={{ borderTop:'1px solid #1e1e2e', margin:'8px 0 4px', padding:'4px 12px 0' }}>
                      <Link href="/submit-spoke" style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 0', textDecoration:'none', color:'#6c63ff', fontSize:'12px', fontWeight:'600' }}>
                        + Submit a Spoke
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              {/* Command Palette */}
              <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}))}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background:'rgba(108,99,255,0.06)', border:'1px solid #1e1e2e', borderRadius:'8px', color:'#6b6b8a', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#6c63ff';e.currentTarget.style.color='#8b85ff'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e1e2e';e.currentTarget.style.color='#6b6b8a'}}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Search
                <kbd style={{padding:'1px 5px',background:'#1a1a2e',borderRadius:'4px',fontSize:'10px',border:'1px solid #2a2a3e'}}>⌘K</kbd>
              </button>
              {session ? (
                <div ref={userRef} style={{ position:'relative' }}>
                  <button onClick={() => setUserOpen(o => !o)}
                    style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(108,99,255,0.1)', border:'1px solid rgba(108,99,255,0.2)', borderRadius:'10px', padding:'7px 12px', cursor:'pointer', color:'#fff', fontFamily:'inherit', transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(108,99,255,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(108,99,255,0.2)'; }}>
                    {session.user?.image
                      ? <img src={session.user.image} alt="" style={{ width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover' }} />
                      : <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'linear-gradient(135deg,#6c63ff,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'800' }}>{session.user?.name?.[0]?.toUpperCase()}</div>
                    }
                    <span style={{ fontSize:'13px', fontWeight:'500', maxWidth:'80px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session.user?.name?.split(' ')[0]}</span>
                  </button>
                  {userOpen && (
                    <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:'210px', background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'8px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', zIndex:200 }}>
                      <div style={{ padding:'10px 12px 10px', borderBottom:'1px solid #1e1e2e', marginBottom:'6px' }}>
                        <div style={{ color:'#fff', fontSize:'13px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session.user?.name}</div>
                        <div style={{ color:'#6b6b8a', fontSize:'11px', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session.user?.email}</div>
                      </div>
                      {[
                        { href:'/dashboard', icon:'📊', label:'Dashboard' },
                        { href:'/dashboard?tab=queries', icon:'🔍', label:'Saved Queries' },
                        { href:'/dashboard?tab=billing', icon:'💳', label:'Billing' },
                      ].map(item => (
                        <Link key={item.href} href={item.href}
                          style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', borderRadius:'8px', textDecoration:'none', color:'#c4c4e0', fontSize:'13px', transition:'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <span>{item.icon}</span>{item.label}
                        </Link>
                      ))}
                      <div style={{ borderTop:'1px solid #1e1e2e', margin:'6px 0 2px' }} />
                      <button onClick={() => { setUserOpen(false); signOut({ callbackUrl:'/' }); }}
                        style={{ width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', borderRadius:'8px', background:'transparent', border:'none', color:'#f87171', fontSize:'13px', cursor:'pointer', fontFamily:'inherit', transition:'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <span>🚪</span> Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/login" style={{ textDecoration:'none', color:'#9999bb', fontSize:'13px', fontWeight:'500', padding:'7px 14px', border:'1px solid #1e1e2e', borderRadius:'8px', transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#6c63ff'; e.currentTarget.style.color='#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#1e1e2e'; e.currentTarget.style.color='#9999bb'; }}>
                    Log in
                  </Link>
                  <Link href="/register" style={{ textDecoration:'none', color:'#fff', fontSize:'13px', fontWeight:'600', padding:'7px 16px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', borderRadius:'8px' }}>
                    Sign up free
                  </Link>
                </>
              )}

              {/* Mobile menu toggle */}
              <button onClick={() => setMobileOpen(o => !o)}
                style={{ display:'none', background:'transparent', border:'none', color:'#9999bb', cursor:'pointer', padding:'6px', fontSize:'18px' }}
                className="mobile-menu-btn">
                {mobileOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ borderTop:'1px solid #1e1e2e', background:'#080810', padding:'16px 24px 24px' }}>
            {[...NAV_LINKS, ...TOOLS].map(l => (
              <Link key={l.href} href={l.href}
                style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 0', textDecoration:'none', color:isActive(l.href)?'#fff':'#9999bb', fontSize:'15px', borderBottom:'1px solid #1e1e2e11' }}>
                {l.icon && <span>{l.icon}</span>}
                {l.label}
              </Link>
            ))}
            {!session && (
              <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
                <Link href="/login" style={{ flex:1, textAlign:'center', padding:'10px', border:'1px solid #1e1e2e', borderRadius:'8px', color:'#9999bb', textDecoration:'none', fontSize:'14px' }}>Log in</Link>
                <Link href="/register" style={{ flex:1, textAlign:'center', padding:'10px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', borderRadius:'8px', color:'#fff', textDecoration:'none', fontSize:'14px', fontWeight:'600' }}>Sign up free</Link>
              </div>
            )}
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </>
  );
}
