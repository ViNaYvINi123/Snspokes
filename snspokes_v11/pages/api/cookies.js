// Cookie consent + preference management API

import { query } from '../../lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    // Return cookie policy info
    return res.status(200).json({
      success: true,
      categories: {
        necessary: { label: 'Necessary', description: 'Required for the site to work. Cannot be disabled.', required: true },
        analytics: { label: 'Analytics', description: 'Help us understand how visitors use the site.', required: false },
        preferences: { label: 'Preferences', description: 'Remember your settings and preferences.', required: false },
        marketing: { label: 'Marketing', description: 'Used to show relevant content.', required: false },
      },
    });
  }

  if (req.method === 'POST') {
    // Save consent
    const { consent } = req.body;
    if (!consent) return res.status(400).json({ error: 'Consent data required' });

    // Set consent cookie (1 year)
    const consentData = JSON.stringify({ ...consent, timestamp: Date.now() });
    const encoded = Buffer.from(consentData).toString('base64');
    const isProduction = process.env.NODE_ENV === 'production';

    res.setHeader('Set-Cookie', [
      `cookie_consent=${encoded}; Path=/; Max-Age=${365 * 24 * 60 * 60}; SameSite=Lax${isProduction ? '; Secure' : ''}`,
    ]);

    return res.status(200).json({ success: true, message: 'Preferences saved' });
  }

  if (req.method === 'DELETE') {
    // Clear consent
    res.setHeader('Set-Cookie', 'cookie_consent=; Path=/; Max-Age=0; SameSite=Lax');
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
