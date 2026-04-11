// ServiceNow update webhook receiver
// ServiceNow Store can be configured to send webhooks on spoke releases
// Also handles manual ping from external monitoring

import { query } from '../../../lib/db';
import { cacheSet } from '../../../lib/redis';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Verify webhook secret if configured
  const secret = process.env.SN_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers['x-sn-signature'] || req.headers['x-hub-signature-256'] || '';
    const body = JSON.stringify(req.body);
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (sig !== expected) return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, spoke_slug, spoke_name, version, release_notes, source = 'webhook' } = req.body || {};

  try {
    // Log the update event
    await query(
      `INSERT INTO sn_system_properties (name, value, description, category, updated_at)
       VALUES ($1, $2, $3, 'Sync', NOW())
       ON CONFLICT (name) DO UPDATE SET value=$2, updated_at=NOW()`,
      [
        `sn.webhook.last_event`,
        JSON.stringify({ event, spoke_slug, spoke_name, version, source, received_at: new Date().toISOString() }),
        'Last webhook event received from ServiceNow'
      ]
    );

    // If a specific spoke was updated, mark it for re-enrichment
    if (spoke_slug) {
      await query(
        `UPDATE sn_spokes SET updated_at=NOW() WHERE slug=$1`,
        [spoke_slug]
      );

      // Invalidate cache for this spoke
      await cacheSet(`spoke:${spoke_slug}`, '', 1).catch(() => {});

      // Store update notification
      await query(
        `INSERT INTO sn_system_properties (name, value, description, category, updated_at)
         VALUES ($1, $2, $3, 'Sync', NOW())
         ON CONFLICT (name) DO UPDATE SET value=$2, updated_at=NOW()`,
        [
          `sn.update.${spoke_slug}`,
          JSON.stringify({ version, release_notes, updated_at: new Date().toISOString() }),
          `Latest update for ${spoke_name || spoke_slug} spoke`
        ]
      );
    }

    return res.status(200).json({ success: true, received: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
