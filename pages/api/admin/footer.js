// Admin: Footer configuration — tagline, social links, columns
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import logger from '../../../lib/logger';

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

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    try {
      const r = await query(
        "SELECT value FROM sn_system_properties WHERE name='footer_config'",
      );
      if (r.rows[0]) {
        return res.status(200).json({ success: true, config: JSON.parse(r.rows[0].value) });
      }
      return res.status(200).json({ success: true, config: DEFAULT_CONFIG });
    } catch (err) {
      // Return defaults if DB not ready
      return res.status(200).json({ success: true, config: DEFAULT_CONFIG });
    }
  }

  if (req.method === 'POST') {
    try {
      const { config } = req.body;
      if (!config) return res.status(400).json({ success: false, error: 'config required' });

      await query(`
        INSERT INTO sn_system_properties (name, value, description, updated_at)
        VALUES ('footer_config', $1, 'Footer configuration JSON', NOW())
        ON CONFLICT (name) DO UPDATE SET value = $1, updated_at = NOW()
      `, [JSON.stringify(config)]);

      logger.info('[admin] Footer config updated');
      return res.status(200).json({ success: true });
    } catch (err) {
      logger.error(`[admin/footer] ${err.message}`);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // PATCH — reset to defaults
  if (req.method === 'PATCH') {
    try {
      await query(`
        INSERT INTO sn_system_properties (name, value, description, updated_at)
        VALUES ('footer_config', $1, 'Footer configuration JSON', NOW())
        ON CONFLICT (name) DO UPDATE SET value = $1, updated_at = NOW()
      `, [JSON.stringify(DEFAULT_CONFIG)]);
      return res.status(200).json({ success: true, config: DEFAULT_CONFIG });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);

// Also expose defaults for Footer component
export { DEFAULT_CONFIG };
