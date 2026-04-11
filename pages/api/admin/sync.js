// ServiceNow data sync engine
// - Imports all spokes + system properties from curated dataset
// - Fetches ServiceNow community RSS for release notes / updates
// - Logs every sync run with diff results

import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import { askAI } from '../../../lib/ai';

// Fetch community RSS for latest spoke updates
async function fetchSNReleaseNotes() {
  try {
    const feeds = [
      'https://www.servicenow.com/community/workflow-data-fabric-blog/bg-p/automation-engine-blog/rss',
      'https://www.servicenow.com/community/developer-blog/bg-p/developer-blog/rss',
    ];
    const results = [];
    for (const url of feeds) {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': 'snspokes-sync/1.0', Accept: 'application/rss+xml,application/xml,text/xml' },
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const xml = await r.text();
          // Parse RSS items
          const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
          for (const [, body] of items.slice(0, 5)) {
            const title   = body.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || body.match(/<title>(.*?)<\/title>/)?.[1] || '';
            const link    = body.match(/<link>(.*?)<\/link>/)?.[1] || '';
            const pubDate = body.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
            if (title.toLowerCase().includes('spoke')) results.push({ title, link, pubDate, source: url });
          }
        }
      } catch {}
    }
    return results;
  } catch {
    return [];
  }
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { action = 'full' } = req.body || {};

  // Ensure schema is up to date
  try {
    await query('ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'professional'');
    await query('ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP');
    await query('ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT ''');
    await query('ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP');
  } catch {}

  const startedAt = new Date();
  let result = { action, started_at: startedAt.toISOString(), spokes: {}, properties: {}, release_notes: [], errors: [] };

  try {
    // ── 1. IMPORT SPOKES ──────────────────────────────────────
    if (action === 'full' || action === 'spokes') {
      const path = require('path');
      const SPOKES = require(path.join(process.cwd(), 'scripts', 'spoke-data.js'));
      let inserted = 0, updated = 0, skipped = 0;

      for (const spoke of SPOKES) {
        try {
          const setupStepsJson = JSON.stringify(spoke.setup_steps || []);
          const actionsJson    = JSON.stringify((spoke.actions || []).map(a => ({ name: a, description: '' })));
          const errorsJson     = JSON.stringify((spoke.common_errors || []).map(e => {
            const parts = e.split('—'); 
            return { error: (parts[0]||e).trim(), fix: (parts[1]||'').trim() };
          }));
          const tagsArr = spoke.tags || [];

          const r = await query(
            `INSERT INTO sn_spokes
              (slug, name, description, icon, category, plugin_id, credential_type,
               official_description, setup_steps, actions, common_errors, tags,
               min_version, is_active, view_count, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,0,NOW(),NOW())
             ON CONFLICT (slug) DO UPDATE SET
               name=EXCLUDED.name, description=EXCLUDED.description, icon=EXCLUDED.icon,
               category=EXCLUDED.category, plugin_id=EXCLUDED.plugin_id,
               credential_type=EXCLUDED.credential_type,
               official_description=EXCLUDED.official_description,
               setup_steps=EXCLUDED.setup_steps, actions=EXCLUDED.actions,
               common_errors=EXCLUDED.common_errors, tags=EXCLUDED.tags,
               min_version=EXCLUDED.min_version, updated_at=NOW()
             RETURNING (xmax = 0) AS is_insert`,
            [spoke.slug, spoke.name, spoke.description, spoke.icon, spoke.category,
             spoke.plugin_id||'', spoke.credential_type||'', spoke.description,
             setupStepsJson, actionsJson, errorsJson, tagsArr, spoke.min_version||'New York']
          );
          if (r.rows[0]?.is_insert) inserted++; else updated++;
        } catch (err) {
          result.errors.push(`Spoke ${spoke.slug}: ${err.message}`);
          skipped++;
        }
      }
      result.spokes = { total: SPOKES.length, inserted, updated, skipped };
    }

    // ── 2. IMPORT SYSTEM PROPERTIES ──────────────────────────
    if (action === 'full' || action === 'properties') {
      const PROPS = require(path.join(process.cwd(), 'scripts', 'system-properties-data.js'));
      let inserted = 0, updated = 0, skipped = 0;

      for (const prop of PROPS) {
        try {
          const existing = await query('SELECT id FROM sn_system_properties WHERE name=$1', [prop.name]);
          if (existing.rows.length === 0) {
            await query(
              `INSERT INTO sn_system_properties
                (name, value, description, category, type, default_value, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
              [prop.name, prop.default_value||'', prop.description||'', prop.category||'Platform',
               prop.type||'string', prop.default_value||'']
            );
            inserted++;
          } else {
            await query(
              `UPDATE sn_system_properties SET
                description=$2, category=$3, type=$4, default_value=$5, updated_at=NOW()
               WHERE name=$1`,
              [prop.name, prop.description||'', prop.category||'Platform',
               prop.type||'string', prop.default_value||'']
            );
            updated++;
          }
        } catch (err) {
          result.errors.push(`Property ${prop.name}: ${err.message}`);
          skipped++;
        }
      }
      result.properties = { total: PROPS.length, inserted, updated, skipped };
    }

    // ── 3. FETCH RELEASE NOTES (community RSS) ────────────────
    if (action === 'full' || action === 'release_notes') {
      const notes = await fetchSNReleaseNotes();
      result.release_notes = notes;

      // Store release notes as system properties for display
      if (notes.length > 0) {
        const existing = await query("SELECT id FROM sn_system_properties WHERE name='sn.release_notes.latest'");
        const val = JSON.stringify(notes.slice(0, 10));
        if (existing.rows.length === 0) {
          await query(
            `INSERT INTO sn_system_properties (name, value, description, category, updated_at)
             VALUES ('sn.release_notes.latest', $1, 'Latest ServiceNow spoke release notes from community', 'Sync', NOW())`,
            [val]
          );
        } else {
          await query(
            `UPDATE sn_system_properties SET value=$1, updated_at=NOW() WHERE name='sn.release_notes.latest'`,
            [val]
          );
        }
      }
    }

    // ── 4. LOG THE SYNC RUN ───────────────────────────────────
    const duration = Date.now() - startedAt.getTime();
    result.duration_ms = duration;
    result.completed_at = new Date().toISOString();

    // Store last sync metadata
    const syncMeta = JSON.stringify({ ...result, errors: result.errors.slice(0, 10) });
    const existing = await query("SELECT id FROM sn_system_properties WHERE name='snspokes.last_sync'");
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO sn_system_properties (name, value, description, category, updated_at)
         VALUES ('snspokes.last_sync', $1, 'Last ServiceNow data sync metadata', 'Sync', NOW())`,
        [syncMeta]
      );
    } else {
      await query(
        `UPDATE sn_system_properties SET value=$1, updated_at=NOW() WHERE name='snspokes.last_sync'`,
        [syncMeta]
      );
    }

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, ...result });
  }
}

export default withAdminAuth(handler);
