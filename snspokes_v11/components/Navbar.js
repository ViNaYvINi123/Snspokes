import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const [dropdown, setDropdown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: '/spokes', label: 'Spokes' },
    { href: '/search', label: 'Search' },
    { href: '/tools/query-builder', label: 'Query Builder' },
    { href: '/tools/error-finder', label: 'Error Finder' },
    { href: '/tools/version-matrix', label: 'Version Matrix' },
    { href: '/tools/code-generator', label: 'Code Generator' },
    { href: '/tools/script-linter', label: 'Script Linter' },
    { href: '/docs', label: 'Docs' },
  ];

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid #1e1e2e', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(12px)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.svg" alt="snspokes" width="30" height="30" style={{ borderRadius: '8px' }} />
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>snspokes<span style={{ color: '#6c63ff' }}>.do</span></span>
          </Link>

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            {links.map(l => (
              <Link key={l.href} href={l.href} style={{ textDecoration: 'none', color: router.pathname === l.href ? '#6c63ff' : '#9999bb', fontSize: '14px', fontWeight: '500', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = router.pathname === l.href ? '#6c63ff' : '#9999bb'}
              >{l.label}</Link>
            ))}
          </div>

          {/* Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {session ? (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setDropdown(!dropdown)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: '#fff' }}>
                  {session.user?.image
                    ? <img src={session.user.image} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                    : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>{session.user?.name?.[0]?.toUpperCase()}</div>
                  }
                  <span style={{ fontSize: '14px' }}>{session.user?.name?.split(' ')[0]}</span>
                  <span style={{ fontSize: '10px', color: '#6b6b8a' }}>▼</span>
                </button>
                {dropdown && (
                  <div style={{ position: 'absolute', top: '48px', right: 0, width: '200px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '8px', zIndex: 200, boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e2e', marginBottom: '8px' }}>
                      <p style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{session.user?.name}</p>
                      <p style={{ color: '#6b6b8a', fontSize: '11px', marginTop: '2px' }}>{session.user?.email}</p>
                    </div>
                    <button onClick={() => { setDropdown(false); signOut({ callbackUrl: '/' }); }} style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#f87171', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontFamily: 'Syne, sans-serif', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" style={{ textDecoration: 'none', color: '#9999bb', fontSize: '14px', fontWeight: '500', padding: '8px 16px', border: '1px solid #1e1e2e', borderRadius: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6c63ff'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#9999bb'; }}
                >Log in</Link>
                <Link href="/register" style={{ textDecoration: 'none', color: '#fff', fontSize: '14px', fontWeight: '600', padding: '8px 16px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', borderRadius: '8px' }}>Sign up free</Link>
              </>
            )}
          </div>
        </div>
      </div>
      {dropdown && <div onClick={() => setDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />}
    </nav>
  );
}
