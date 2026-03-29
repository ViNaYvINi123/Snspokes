import { cacheGet, cacheSet } from '../../lib/redis';
import { query } from '../../lib/db';
import { callN8n } from '../../lib/n8n';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.body;
  if (!slug?.trim()) return res.status(400).json({ success: false, error: 'Slug required' });

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const startTime = Date.now();

  // Check DB first
  try {
    const dbRes = await query('SELECT * FROM sn_spokes WHERE slug=$1 LIMIT 1', [cleanSlug]);
    if (dbRes.rows.length > 0) {
      const spoke = dbRes.rows[0];
      const hasContent = spoke.ai_description?.length > 50 && Array.isArray(spoke.setup_steps) && spoke.setup_steps.length > 0;
      if (hasContent) {
        query('UPDATE sn_spokes SET view_count=view_count+1 WHERE slug=$1', [cleanSlug]).catch(() => {});
        return res.status(200).json({ success: true, spoke, from_ai: false, latency_ms: Date.now() - startTime });
      }
    }
  } catch {}

  // Generate via n8n → OpenRouter
  try {
    // Get existing spoke metadata for context
    const meta = await query('SELECT name,category,plugin_id,credential_type,min_version FROM sn_spokes WHERE slug=$1', [cleanSlug]);
    const existing = meta.rows[0] || {};

    const result = await callN8n('sn-enrich-spoke', {
      slug: cleanSlug,
      name: existing.name || cleanSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      category:         existing.category || 'Integration',
      plugin_id:        existing.plugin_id || '',
      credential_type:  existing.credential_type || 'OAuth 2.0',
      min_version:      existing.min_version || 'Rome',
    }, 120000);

    const spokeData = result.spoke || result;
    return res.status(200).json({
      success: true, spoke: spokeData, from_ai: true,
      model: result.model, saved: result.saved,
      latency_ms: Date.now() - startTime,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to load spoke. Please try again.', details: process.env.NODE_ENV !== 'production' ? err.message : undefined });
  }
}
