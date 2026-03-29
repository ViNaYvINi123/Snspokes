import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #1e1e2e', background: '#080810', padding: '48px 24px', marginTop: '80px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '40px', marginBottom: '40px' }}>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff' }}>S</div>
              <span style={{ fontWeight: '700', color: '#fff' }}>snspokes<span style={{ color: '#6c63ff' }}>.do</span></span>
            </div>
            <p style={{ color: '#6b6b8a', fontSize: '14px', lineHeight: '1.6' }}>The definitive reference for ServiceNow Integration Hub spokes.</p>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Product</h4>
            {[{ label: 'Search Spokes', href: '/search' }, { label: 'All Spokes', href: '/spokes' }, { label: 'Docs', href: '/docs' }].map(item => (
              <div key={item.href} style={{ marginBottom: '10px' }}>
                <Link href={item.href} style={{ color: '#6b6b8a', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = '#6b6b8a'}
                >{item.label}</Link>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Resources</h4>
            {[
              { label: 'ServiceNow Docs', href: 'https://docs.servicenow.com' },
              { label: 'Community', href: 'https://community.servicenow.com' },
              { label: 'Integration Hub', href: 'https://docs.servicenow.com/bundle/washingtondc-integrate-applications/page/administer/integrationhub/concept/integrationhub.html' },
              { label: 'Release Notes', href: 'https://docs.servicenow.com/bundle/release-notes/page/release-notes/release-notes-landing.html' },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: '10px' }}>
                <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ color: '#6b6b8a', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = '#6b6b8a'}
                >{item.label} ↗</a>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Account</h4>
            {[{ label: 'Sign Up Free', href: '/register' }, { label: 'Log In', href: '/login' }].map(item => (
              <div key={item.href} style={{ marginBottom: '10px' }}>
                <Link href={item.href} style={{ color: '#6b6b8a', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = '#6b6b8a'}
                >{item.label}</Link>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e1e2e', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ color: '#6b6b8a', fontSize: '13px' }}>© 2026 snspokes — All rights reserved</p>
          <p style={{ color: '#6b6b8a', fontSize: '13px' }}>Built for ServiceNow Developers 🚀</p>
        </div>
      </div>
    </footer>
  );
}
