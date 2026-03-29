import { query } from '../../../lib/db';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req, res) {
  const { slug } = req.query;
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    const whRes = await query('SELECT * FROM sn_webhooks WHERE slug=$1 AND is_active=true', [slug]);
    if (!whRes.rows.length) return res.status(404).json({ error: 'Webhook not found' });
    const webhook = whRes.rows[0];

    // Signature verification
    if (webhook.secret) {
      const signature = req.headers['x-webhook-signature'] || req.headers['x-hub-signature-256'] || '';
      const expected = 'sha256=' + crypto.createHmac('sha256', webhook.secret).update(JSON.stringify(req.body)).digest('hex');
      if (signature !== expected) return res.status(401).json({ error: 'Invalid signature' });
    }

    const sourceIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await query('INSERT INTO sn_webhook_events (webhook_id, payload, headers, source_ip) VALUES ($1,$2,$3,$4)',
      [webhook.id, JSON.stringify(req.body), JSON.stringify(req.headers), sourceIp]);
    await query('UPDATE sn_webhooks SET total_received=total_received+1, last_received=NOW() WHERE id=$1', [webhook.id]);

    // Forward to n8n
    if (webhook.forward_to) {
      axios.post(webhook.forward_to, { webhook_slug: slug, payload: req.body, received_at: new Date().toISOString() }, { timeout: 5000 }).catch(() => {});
    }

    return res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (err) {
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
