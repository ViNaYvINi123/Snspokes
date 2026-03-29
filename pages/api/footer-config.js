// Public: Returns footer config for the Footer component
import { query } from '../../lib/db';
import { setSecurityHeaders } from '../../lib/security';

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

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).end();

  // Cache for 5 minutes
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');

  try {
    const r = await query("SELECT value FROM sn_system_properties WHERE name='footer_config'");
    if (r.rows[0]) {
      return res.status(200).json(JSON.parse(r.rows[0].value));
    }
  } catch {}

  return res.status(200).json(DEFAULT_CONFIG);
}
