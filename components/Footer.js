import { useState, useEffect } from 'react';
import Link from 'next/link';

// Default config — used before API loads and as fallback
const DEFAULT_CONFIG = {
  tagline: 'The definitive reference for ServiceNow Integration Hub spokes.',
  show_status_badge: true,
  columns: {
    Product: [
      { label: 'Search Spokes',  href: '/search' },
      { label: 'All Spokes',     href: '/spokes' },
      { label: 'Pricing',        href: '/pricing' },
      { label: 'Changelog',      href: '/changelog' },
      { label: 'Status',         href: '/status' },
    ],
    Tools: [
      { label: 'Code Generator', href: '/tools/code-generator' },
      { label: 'Script Linter',  href: '/tools/script-linter' },
      { label: 'Error Finder',   href: '/tools/error-finder' },
      { label: 'Query Builder',  href: '/tools/query-builder' },
      { label: 'Version Matrix', href: '/tools/version-matrix' },
    ],
    Resources: [
      { label: 'Documentation',  href: '/docs' },
      { label: 'Submit a Spoke', href: '/submit-spoke' },
      { label: 'SN Docs ↗',      href: 'https://docs.servicenow.com', ext: true },
      { label: 'SN Community ↗', href: 'https://community.servicenow.com', ext: true },
    ],
    Company: [
      { label: 'Sign Up Free',      href: '/register' },
      { label: 'Sign In',           href: '/login' },
      { label: 'Privacy Policy',    href: '/privacy' },
      { label: 'Terms of Service',  href: '/terms' },
    ],
  },
  social_links: [],
  bottom_text: '',
  hide_columns: [],
};

const linkStyle = {
  color: '#6b6b8a', fontSize: '13px', textDecoration: 'none',
  display: 'block', marginBottom: '10px', transition: 'color 0.15s',
};

const SOCIAL_ICONS = {
  twitter:  'https://abs.twimg.com/favicons/twitter.2.ico',
  linkedin: '💼',
  github:   '🐙',
  discord:  '💬',
  youtube:  '▶️',
};

export default function Footer() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    fetch('/api/footer-config')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setConfig(d); })
      .catch(() => {}); // silently use defaults
  }, []);

  const visibleColumns = Object.entries(config.columns || {})
    .filter(([name]) => !(config.hide_columns || []).includes(name));

  return (
    <footer style={{
      borderTop: '1px solid #1e1e2e', background: '#060810',
      paddingTop: '60px', paddingBottom: '40px', marginTop: '80px',
      fontFamily: "'Syne', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

        {/* Top section */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`, gap: '40px', marginBottom: '48px' }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#6c63ff,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff', fontSize: '14px' }}>S</div>
              <span style={{ fontWeight: '800', color: '#fff', fontSize: '16px', letterSpacing: '-0.02em' }}>
                snspokes<span style={{ color: '#6c63ff' }}>.com</span>
              </span>
            </div>
            <p style={{ color: '#6b6b8a', fontSize: '13px', lineHeight: '1.65', maxWidth: '200px' }}>
              {config.tagline}
            </p>

            {/* Social links */}
            {config.social_links?.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                {config.social_links.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                    title={s.label}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '14px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#2a2a3e'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1e1e2e'}>
                    {SOCIAL_ICONS[s.type] || '🔗'}
                  </a>
                ))}
              </div>
            )}

            {/* Status badge */}
            {config.show_status_badge && (
              <Link href="/status" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', padding: '5px 12px', background: '#052e16', border: '1px solid #16a34a33', borderRadius: '20px', textDecoration: 'none' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: '600' }}>All systems operational</span>
              </Link>
            )}
          </div>

          {/* Dynamic link columns */}
          {visibleColumns.map(([title, items]) => (
            <div key={title}>
              <h4 style={{ color: '#fff', fontSize: '13px', fontWeight: '700', marginBottom: '16px', letterSpacing: '0.02em' }}>{title}</h4>
              {(items || []).map(item => (
                item.ext
                  ? <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer"
                      style={linkStyle}
                      onMouseEnter={e => e.target.style.color = '#e2e8f0'}
                      onMouseLeave={e => e.target.style.color = '#6b6b8a'}>
                      {item.label}
                    </a>
                  : <Link key={item.href} href={item.href}
                      style={linkStyle}
                      onMouseEnter={e => e.target.style.color = '#e2e8f0'}
                      onMouseLeave={e => e.target.style.color = '#6b6b8a'}>
                      {item.label}
                    </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Custom bottom text */}
        {config.bottom_text && (
          <div style={{ borderTop: '1px solid #1e1e2e', paddingTop: '20px', marginBottom: '16px' }}>
            <p style={{ color: '#4b4b6a', fontSize: '12px', lineHeight: '1.6' }}>{config.bottom_text}</p>
          </div>
        )}

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #1e1e2e', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ color: '#4b4b6a', fontSize: '12px' }}>
            © {new Date().getFullYear()} snspokes — All rights reserved
          </p>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Privacy', 'Terms', 'Status', 'Changelog'].map(label => (
              <Link key={label} href={`/${label.toLowerCase()}`}
                style={{ color: '#4b4b6a', fontSize: '12px', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#9999bb'}
                onMouseLeave={e => e.target.style.color = '#4b4b6a'}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
