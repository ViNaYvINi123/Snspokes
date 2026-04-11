/**
 * Auto-sync cron endpoint
 *
 * HOW AUTOMATIC SYNC WORKS:
 *
 * This endpoint is called by a cron job on the server every day at 3am.
 * It runs Tier 2 (RSS) + Tier 3 (AI enrichment) automatically.
 * Tier 1 (static seed) only runs manually or on first deploy.
 *
 * Setup on Hetzner:
 *   crontab -e
 *   0 3 * * * curl -s -X GET "https://snspokes.com/api/cron/sync-spokes?secret=YOUR_CRON_SECRET"
 *
 * Add CRON_SECRET to .env.local on the server.
 */

import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);

  // Auth check
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  const expected = process.env.CRON_SECRET;
  if (expected && secret !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const log = [];
  const addLog = (msg) => { log.push({ time: new Date().toISOString(), msg }); };
  const startedAt = Date.now();

  try {
    addLog('cron sync started');

    // ── Check last sync (skip if ran in last 20 hours) ──────────
    const lastRow = await query(
      "SELECT updated_at FROM sn_system_properties WHERE name='snspokes.last_cron_sync' LIMIT 1"
    );
    if (lastRow.rows.length > 0) {
      const hoursSince = (Date.now() - new Date(lastRow.rows[0].updated_at).getTime()) / 3600000;
      if (hoursSince < 20) {
        addLog(`skipped — last ran ${hoursSince.toFixed(1)}h ago (threshold 20h)`);
        return res.status(200).json({ success: true, skipped: true, log });
      }
    }

    // ── Tier 2: Fetch ServiceNow community RSS ──────────────────
    addLog('fetching ServiceNow community RSS...');
    let newReleases = [];
    const rssUrls = [
      'https://www.servicenow.com/community/workflow-data-fabric-blog/bg-p/automation-engine-blog/rss',
      'https://www.servicenow.com/community/developer-blog/bg-p/developer-blog/rss',
    ];
    for (const url of rssUrls) {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': 'snspokes-bot/1.0 (+https://snspokes.com)', Accept: 'application/xml' },
          signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) { addLog(`RSS ${url}: HTTP ${r.status}`); continue; }
        const xml = await r.text();
        const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
        let count = 0;
        for (const [, body] of items.slice(0, 20)) {
          const title = body.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)?.[1]?.trim() || '';
          const link  = body.match(/<link>(.*?)<\/link>/s)?.[1]?.trim() || '';
          const date  = body.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1]?.trim() || '';
          if (title.toLowerCase().includes('spoke') || title.toLowerCase().includes('integration hub')) {
            newReleases.push({ title, link, date });
            count++;
          }
        }
        addLog(`RSS ${new URL(url).hostname}: found ${count} spoke posts`);
      } catch (e) {
        addLog(`RSS error: ${e.message.slice(0,60)}`);
      }
    }

    // Store release notes if found
    if (newReleases.length > 0) {
      await query(`
        INSERT INTO sn_system_properties (name, value, description, category, updated_at)
        VALUES ('sn.release_notes.latest', $1, 'SN community release notes', 'Sync', NOW())
        ON CONFLICT (name) DO UPDATE SET value=$1, updated_at=NOW()
      `, [JSON.stringify(newReleases.slice(0, 10))]);
      addLog(`stored ${newReleases.length} release notes`);
    }

    // ── Tier 3: AI enrich up to 3 empty spokes per day ─────────
    addLog('checking for unenriched spokes...');
    const emptySpokes = await query(`
      SELECT id, slug, name, category, description FROM sn_spokes
      WHERE (ai_description IS NULL OR ai_description = '')
        AND is_active = true
      ORDER BY view_count DESC
      LIMIT 3
    `);

    let enrichedCount = 0;
    if (emptySpokes.rows.length > 0) {
      addLog(`found ${emptySpokes.rows.length} spokes to enrich`);
      const { askAI } = await import('../../../lib/ai.js');

      for (const spoke of emptySpokes.rows) {
        try {
          const prompt = `ServiceNow Integration Hub expert. Describe the "${spoke.name}" spoke in JSON only:
{"ai_description":"2-3 technical sentences for developers","personal_tip":"one practical gotcha or tip","code_example":"4-6 line realistic ServiceNow JavaScript snippet"}`;
          const raw = await askAI(prompt, { max_tokens: 350, temperature: 0.3 });
          const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
          await query(
            'UPDATE sn_spokes SET ai_description=$2, personal_tip=$3, code_example=$4, updated_at=NOW() WHERE id=$1',
            [spoke.id,
             (parsed.ai_description||'').slice(0,800),
             (parsed.personal_tip||'').slice(0,500),
             (parsed.code_example||'').slice(0,1000)]
          );
          enrichedCount++;
          addLog(`enriched: ${spoke.slug}`);
        } catch (e) {
          addLog(`enrich failed: ${spoke.slug} — ${e.message.slice(0,40)}`);
        }
      }
    } else {
      addLog('all spokes already enriched');
    }

    // ── Mark cron run ──────────────────────────────────────────
    const duration = Date.now() - startedAt;
    const summary = {
      ran_at: new Date().toISOString(),
      duration_ms: duration,
      release_notes_found: newReleases.length,
      spokes_enriched: enrichedCount,
    };
    await query(`
      INSERT INTO sn_system_properties (name, value, description, category, updated_at)
      VALUES ('snspokes.last_cron_sync', $1, 'Last cron sync result', 'Sync', NOW())
      ON CONFLICT (name) DO UPDATE SET value=$1, updated_at=NOW()
    `, [JSON.stringify(summary)]);

    addLog(`done in ${duration}ms`);
    return res.status(200).json({ success: true, ...summary, log });

  } catch (err) {
    addLog(`fatal: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message, log });
  }
}
