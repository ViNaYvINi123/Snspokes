import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import CommandPalette from './CommandPalette';

const NAV = [
  { href:'/search',       label:'Search' },
  { href:'/spokes',       label:'Spokes' },
  { href:'/api-reference',label:'API Docs' },
  { href:'/pricing',      label:'Pricing' },
];

const TOOLS = [
  { href:'/tools/code-generator', icon:'💻', label:'Code Generator',  desc:'AI-powered SN scripts' },
  { href:'/tools/error-finder',   icon:'🐛', label:'Error Finder',    desc:'Paste error → get fix' },
  { href:'/tools/cheatsheet',     icon:'📖', label:'Cheatsheet',      desc:'GlideRecord quick ref' },
];

export default function Navbar() {
  const router          = useRouter();
  const { data: session } = useSession();
  const [scrolled, setScrolled]   = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userOpen, setUserOpen]   = useState(false);
  const [showKb, setShowKb]       = useState(false);
  const toolsRef = useRef(null);
  const userRef  = useRef(null);
  const mono = { fontFamily:"'JetBrains Mono',monospace" };

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', h, { passive:true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isActive = (href) => router.pathname === href || router.pathname.startsWith(href + '/');

  return (
    <>
      <CommandPalette onShowKeyboard={() => setShowKb(true)} />

      {/* Keyboard shortcuts modal */}
      {showKb && (
        <div onClick={() => setShowKb(false)}
          style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.7)',
            backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#0a0a14', border:'1px solid rgba(108,99,255,.2)', borderRadius:'16px',
              padding:'24px', maxWidth:'360px', width:'100%', boxShadow:'0 32px 80px rgba(0,0,0,.7)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <span style={{ ...mono, fontSize:'11px', color:'#6c63ff', letterSpacing:'1.5px' }}>KEYBOARD SHORTCUTS</span>
              <button onClick={() => setShowKb(false)}
                style={{ background:'none', border:'none', color:'#374151', cursor:'pointer', fontSize:'18px' }}>×</button>
            </div>
            {[
              [['⌘','K'],'Command palette'],
              [['↑','↓'],'Navigate results'],
              [['↵'],'Select / open'],
              [['Esc'],'Close / dismiss'],
              [['?'],'Show this panel'],
            ].map(([keys, label]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'8px 0', borderBottom:'1px solid #0d0d18' }}>
                <span style={{ color:'#6b7280', fontSize:'13px' }}>{label}</span>
                <div style={{ display:'flex', gap:'4px' }}>
                  {keys.map((k, j) => (
                    <kbd key={j} style={{ ...mono, padding:'2px 8px', background:'#111',
                      border:'1px solid #1e1e2e', borderRadius:'5px', fontSize:'11px', color:'#9ca3af' }}>{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:1000,
        height:'56px', display:'flex', alignItems:'center', padding:'0 20px',
        background: scrolled ? 'rgba(4,4,7,.96)' : 'rgba(4,4,7,.7)',
        backdropFilter:'blur(20px)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,.06)' : '1px solid transparent',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,.4)' : 'none',
        transition:'all .25s ease',
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center',
          gap:'9px', flexShrink:0, marginRight:'24px' }}>
          <div style={{ width:'30px', height:'30px', borderRadius:'8px', flexShrink:0,
            background:'linear-gradient(135deg,#6c63ff,#a855f7)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px' }}>⚡</div>
          <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800,
            fontSize:'17px', color:'#f0f4ff', letterSpacing:'-0.5px' }}>snspokes</span>
        </Link>

        {/* Nav links */}
        <div style={{ display:'flex', alignItems:'center', gap:'2px', flex:1 }}>
          {NAV.map(l => (
            <Link key={l.href} href={l.href}
              style={{ textDecoration:'none', color: isActive(l.href) ? '#e8eaf6' : '#6b7280',
                fontSize:'13.5px', fontWeight: isActive(l.href) ? 600 : 500,
                padding:'6px 12px', borderRadius:'8px', whiteSpace:'nowrap',
                background: isActive(l.href) ? 'rgba(108,99,255,.1)' : 'transparent',
                transition:'all .15s', fontFamily:"'DM Sans',sans-serif" }}
              onMouseEnter={e => { if (!isActive(l.href)) { e.currentTarget.style.color='#e8eaf6'; e.currentTarget.style.background='rgba(255,255,255,.05)'; }}}
              onMouseLeave={e => { if (!isActive(l.href)) { e.currentTarget.style.color='#6b7280'; e.currentTarget.style.background='transparent'; }}}>
              {l.label}
            </Link>
          ))}

          {/* Tools dropdown */}
          <div ref={toolsRef} style={{ position:'relative' }}>
            <button onClick={() => setToolsOpen(o => !o)}
              style={{ display:'flex', alignItems:'center', gap:'5px',
                color: toolsOpen ? '#e8eaf6' : '#6b7280', fontSize:'13.5px', fontWeight:500,
                padding:'6px 12px', borderRadius:'8px', background: toolsOpen ? 'rgba(255,255,255,.05)' : 'transparent',
                border:'none', cursor:'pointer', transition:'all .15s', fontFamily:"'DM Sans',sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.color='#e8eaf6'; e.currentTarget.style.background='rgba(255,255,255,.05)'; }}
              onMouseLeave={e => { if (!toolsOpen) { e.currentTarget.style.color='#6b7280'; e.currentTarget.style.background='transparent'; }}}>
              Tools
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d={toolsOpen ? 'M2 7l3-3 3 3' : 'M2 3l3 3 3-3'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {toolsOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, width:'240px',
                background:'#06060e', border:'1px solid rgba(255,255,255,.08)', borderRadius:'14px',
                overflow:'hidden', boxShadow:'0 16px 48px rgba(0,0,0,.6)',
                animation:'fadeDown .15s ease' }}>
                <style>{`@keyframes fadeDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
                {TOOLS.map(t => (
                  <Link key={t.href} href={t.href} onClick={() => setToolsOpen(false)}
                    style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 14px',
                      textDecoration:'none', transition:'background .1s',
                      borderBottom:'1px solid rgba(255,255,255,.03)' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(108,99,255,.08)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <span style={{ fontSize:'18px', width:'24px', textAlign:'center' }}>{t.icon}</span>
                    <div>
                      <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>{t.label}</div>
                      <div style={{ ...mono, fontSize:'9.5px', color:'#374151' }}>{t.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
          {/* Cmd+K hint */}
          <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key:'k', ctrlKey:true, bubbles:true }))}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 10px',
              background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)',
              borderRadius:'8px', cursor:'pointer', transition:'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='rgba(108,99,255,.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,.07)'}>
            <svg width="12" height="12" fill="none" stroke="#4b5563" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span style={{ ...mono, fontSize:'9.5px', color:'#374151' }}>⌘K</span>
          </button>

          {session ? (
            <div ref={userRef} style={{ position:'relative' }}>
              <button onClick={() => setUserOpen(o => !o)}
                style={{ width:'32px', height:'32px', borderRadius:'50%', border:'1px solid rgba(108,99,255,.3)',
                  background:'linear-gradient(135deg,#6c63ff,#a855f7)', display:'flex',
                  alignItems:'center', justifyContent:'center', cursor:'pointer',
                  color:'#fff', fontSize:'12px', fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
                {(session.user?.name || session.user?.email || 'U')[0].toUpperCase()}
              </button>
              {userOpen && (
                <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:'180px',
                  background:'#06060e', border:'1px solid rgba(255,255,255,.08)', borderRadius:'12px',
                  overflow:'hidden', boxShadow:'0 16px 48px rgba(0,0,0,.6)',
                  animation:'fadeDown .15s ease' }}>
                  <div style={{ padding:'10px 14px', borderBottom:'1px solid #0d0d18' }}>
                    <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:600, fontFamily:"'DM Sans',sans-serif",
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {session.user?.name || session.user?.email}
                    </div>
                    <div style={{ ...mono, fontSize:'9px', color:'#374151' }}>free plan</div>
                  </div>
                  {[
                    { href:'/dashboard', label:'Dashboard' },
                    { href:'/dashboard/saved', label:'Saved Items' },
                    { href:'/settings', label:'Settings' },
                  ].map(l => (
                    <Link key={l.href} href={l.href} onClick={() => setUserOpen(false)}
                      style={{ display:'block', padding:'9px 14px', color:'#6b7280', fontSize:'13px',
                        textDecoration:'none', fontFamily:"'DM Sans',sans-serif",
                        borderBottom:'1px solid #0d0d18', transition:'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.04)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      {l.label}
                    </Link>
                  ))}
                  <button onClick={() => signOut({ callbackUrl:'/' })}
                    style={{ display:'block', width:'100%', padding:'9px 14px', background:'none', border:'none',
                      color:'#f87171', fontSize:'13px', cursor:'pointer', textAlign:'left',
                      fontFamily:"'DM Sans',sans-serif", transition:'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,.06)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login"
              style={{ padding:'7px 16px', background:'linear-gradient(135deg,#6c63ff,#a855f7)',
                borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:600,
                textDecoration:'none', fontFamily:"'DM Sans',sans-serif", transition:'opacity .15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity='.85'}
              onMouseLeave={e => e.currentTarget.style.opacity='1'}>
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
