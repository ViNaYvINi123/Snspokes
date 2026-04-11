// Scheduled sync endpoint — call daily via cron:
// 0 3 * * * curl -X POST https://snspokes.com/api/cron/sync-spokes -H "x-cron-secret: YOUR_SECRET"

import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Skip if synced in last 12 hours
    const last = await query(
      "SELECT updated_at FROM sn_system_properties WHERE name='snspokes.last_sync' LIMIT 1"
    );
    if (last.rows.length > 0) {
      const hoursSince = (Date.now() - new Date(last.rows[0].updated_at).getTime()) / 3600000;
      if (hoursSince < 12) {
        return res.status(200).json({ success:true, skipped:true, reason:`synced ${hoursSince.toFixed(1)}h ago` });
      }
    }

    // Fetch ServiceNow community RSS for new spoke release posts
    const feeds = [
      'https://www.servicenow.com/community/workflow-data-fabric-blog/bg-p/automation-engine-blog/rss',
    ];
    let newReleases = [];
    for (const url of feeds) {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': 'snspokes-sync/1.0' },
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const xml = await r.text();
          const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
          for (const [, body] of items.slice(0, 10)) {
            const title = body.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
                       || body.match(/<title>(.*?)<\/title>/)?.[1] || '';
            if (title.toLowerCase().includes('spoke')) {
              const link = body.match(/<link>(.*?)<\/link>/)?.[1] || '';
              const pubDate = body.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
              newReleases.push({ title, link, pubDate });
            }
          }
        }
      } catch {}
    }

    // Store release notes
    if (newReleases.length > 0) {
      await query(
        `INSERT INTO sn_system_properties (name, value, description, category, updated_at)
         VALUES ('sn.release_notes.latest', $1, 'Latest SN spoke release notes', 'Sync', NOW())
         ON CONFLICT (name) DO UPDATE SET value=$1, updated_at=NOW()`,
        [JSON.stringify(newReleases)]
      );
    }

    // Log run
    await query(
      `INSERT INTO sn_system_properties (name, value, description, category, updated_at)
       VALUES ('snspokes.last_cron_sync', $1, 'Last cron sync', 'Sync', NOW())
       ON CONFLICT (name) DO UPDATE SET value=$1, updated_at=NOW()`,
      [JSON.stringify({ ran_at: new Date().toISOString(), new_releases: newReleases.length })]
    );

    return res.status(200).json({ success:true, new_releases: newReleases.length, ran_at: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ success:false, error: err.message });
  }
}
