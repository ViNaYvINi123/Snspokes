/**
 * snspokes custom Next.js server
 * Runs the Next.js app + all scheduled background jobs in one process.
 * No external cron daemon needed — jobs start automatically when Docker starts.
 */

const { createServer } = require('http');
const { parse }        = require('url');
const next             = require('next');
const cron             = require('node-cron');
const path             = require('path');
const fs               = require('fs');

const dev  = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3001', 10);
const app  = next({ dev });
const handle = app.getRequestHandler();

// ─────────────────────────────────────────────────────────────────
// SCHEDULER — all jobs defined here, start after app is ready
// ─────────────────────────────────────────────────────────────────

function startScheduler() {
  console.log('[scheduler] starting background jobs');

  // ── Job 1: ServiceNow Sync — runs every night at midnight ──────
  // Cron: "0 0 * * *" = 00:00 every day
  // What it does:
  //   1. Upserts all spokes + properties from local data files
  //   2. Fetches ServiceNow community RSS for new spoke release posts
  //   3. AI-enriches up to 5 spokes with empty descriptions
  cron.schedule('0 0 * * *', async () => {
    console.log('[scheduler][sync] midnight sync started');
    try {
      await runSync('full');
    } catch (err) {
      console.error('[scheduler][sync] error:', err.message);
    }
  }, { timezone: 'UTC' });

  // ── Job 2: RSS check every 6 hours (catches same-day SN releases)
  cron.schedule('0 */6 * * *', async () => {
    console.log('[scheduler][rss] 6-hour RSS check');
    try {
      await runSync('release_notes');
    } catch (err) {
      console.error('[scheduler][rss] error:', err.message);
    }
  }, { timezone: 'UTC' });

  // ── Job 3: AI enrichment — every 4 hours, enriches 3 spokes ───
  cron.schedule('0 */4 * * *', async () => {
    console.log('[scheduler][enrich] AI enrichment run');
    try {
      await runSync('enrich');
    } catch (err) {
      console.error('[scheduler][enrich] error:', err.message);
    }
  }, { timezone: 'UTC' });

  console.log('[scheduler] jobs registered:');
  console.log('  - Full sync:       daily at 00:00 UTC');
  console.log('  - RSS check:       every 6 hours');
  console.log('  - AI enrichment:   every 4 hours');
}

// ─────────────────────────────────────────────────────────────────
// SYNC ENGINE — runs directly in-process (no HTTP round-trip)
// ─────────────────────────────────────────────────────────────────

async function runSync(action) {
  // Lazy-load DB + AI to avoid import issues at startup
  const { query }  = require('./lib/db');
  const startedAt  = Date.now();
  const log        = (...args) => console.log('[scheduler][sync]', ...args);
  const result     = { action, spokes_updated:0, props_updated:0, releases_found:0, enriched:[], errors:[] };

  try {

    // Auto-migrate schema
    await Promise.all([
      query("ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'professional'").catch(()=>{}),
      query("ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP").catch(()=>{}),
      query("ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP").catch(()=>{}),
    ]);

    // ── Tier 1: Static seed ──────────────────────────────────────
    if (['full','spokes','api'].includes(action)) {
      const SPOKES = require(path.join(__dirname, 'scripts', 'spoke-data.js'));
      log(`upserting ${SPOKES.length} spokes...`);
      for (const s of SPOKES) {
        try {
          await query(`
            INSERT INTO sn_spokes
              (slug, name, description, icon, category, plugin_id, credential_type,
               official_description, setup_steps, actions, common_errors, tags,
               tier, min_version, is_active, view_count, last_synced_at, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,0,NOW(),NOW(),NOW())
            ON CONFLICT (slug) DO UPDATE SET
              name=$2, description=$3, icon=$4, category=$5, plugin_id=$6,
              credential_type=$7, official_description=$8, setup_steps=$9,
              actions=$10, common_errors=$11, tags=$12, tier=$13, min_version=$14,
              last_synced_at=NOW(), updated_at=NOW()
          `, [
            s.slug, s.name, s.description, s.icon, s.category,
            s.plugin_id||'', s.credential_type||'', s.description,
            JSON.stringify(s.setup_steps||[]),
            JSON.stringify((s.actions||[]).map(a=>({name:a,description:''}))),
            JSON.stringify((s.common_errors||[]).map(e=>{
              const [err,fix]=e.split('—'); return {error:(err||e).trim(),fix:(fix||'').trim()};
            })),
            s.tags||[], s.tier||'professional', s.min_version||'New York',
          ]);
          result.spokes_updated++;
        } catch(e) { result.errors.push(`spoke:${s.slug}:${e.message.slice(0,60)}`); }
      }
      log(`spokes done — ${result.spokes_updated} upserted`);
    }

    if (['full','properties','api'].includes(action)) {
      const PROPS = require(path.join(__dirname, 'scripts', 'system-properties-data.js'));
      log(`upserting ${PROPS.length} system properties...`);
      for (const p of PROPS) {
        try {
          await query(`
            INSERT INTO sn_system_properties
              (name, value, description, category, type, default_value, last_synced_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
            ON CONFLICT (name) DO UPDATE SET
              description=$3, category=$4, type=$5, default_value=$6,
              last_synced_at=NOW(), updated_at=NOW()
          `, [p.name, p.default_value||'', p.description||'',
              p.category||'Platform', p.type||'string', p.default_value||'']);
          result.props_updated++;
        } catch(e) { result.errors.push(`prop:${p.name}:${e.message.slice(0,50)}`); }
      }
      log(`properties done — ${result.props_updated} upserted`);
    }

    // ── Tier 2: ServiceNow community RSS ─────────────────────────
    if (['full','release_notes'].includes(action)) {
      log('fetching ServiceNow community RSS...');
      const releases = await fetchCommunityRSS();
      result.releases_found = releases.length;

      if (releases.length > 0) {
        log(`found ${releases.length} spoke release posts`);
        await query(`
          INSERT INTO sn_system_properties (name, value, description, category, updated_at)
          VALUES ('sn.release_notes.latest', $1, 'SN community release notes', 'Sync', NOW())
          ON CONFLICT (name) DO UPDATE SET value=$1, updated_at=NOW()
        `, [JSON.stringify(releases.slice(0,10))]).catch(()=>{});
      } else {
        log('RSS: no spoke posts found (may be unreachable from this network)');
      }
    }

    // ── Tier 3: AI enrichment ─────────────────────────────────────
    if (['full','enrich'].includes(action)) {
      const emptySpokes = await query(`
        SELECT id, slug, name, category, description FROM sn_spokes
        WHERE (ai_description IS NULL OR ai_description = '')
          AND is_active = true
        ORDER BY view_count DESC LIMIT 5
      `);

      if (emptySpokes.rows.length > 0) {
        log(`enriching ${emptySpokes.rows.length} empty spokes with AI...`);
        const { askAI } = require('./lib/ai');
        for (const spoke of emptySpokes.rows) {
          try {
            const prompt = `ServiceNow expert. Describe the "${spoke.name}" spoke in JSON only (no markdown):
{"ai_description":"2-3 sentence technical description for developers","personal_tip":"one practical gotcha or tip a senior developer would share","code_example":"realistic 4-6 line ServiceNow JavaScript snippet showing a typical use case"}`;
            const raw    = await askAI(prompt, { max_tokens:350, temperature:0.3 });
            const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
            await query(
              `UPDATE sn_spokes SET
                ai_description=$2, personal_tip=$3, code_example=$4, updated_at=NOW()
               WHERE id=$1`,
              [spoke.id,
               (parsed.ai_description||'').slice(0,800),
               (parsed.personal_tip  ||'').slice(0,500),
               (parsed.code_example  ||'').slice(0,1000)]
            );
            result.enriched.push(spoke.slug);
            log(`enriched: ${spoke.slug}`);
          } catch(e) {
            log(`enrich failed: ${spoke.slug} —`, e.message.slice(0,50));
          }
        }
      } else {
        log('all spokes already enriched');
      }
    }

    // Save sync log
    const meta = {
      action,
      completed_at:    new Date().toISOString(),
      duration_ms:     Date.now() - startedAt,
      spokes_updated:  result.spokes_updated,
      props_updated:   result.props_updated,
      releases_found:  result.releases_found,
      enriched:        result.enriched,
      errors:          result.errors.slice(0,10),
    };
    await query(`
      INSERT INTO sn_system_properties (name, value, description, category, updated_at)
      VALUES ('snspokes.last_sync', $1, 'Last sync metadata', 'Sync', NOW())
      ON CONFLICT (name) DO UPDATE SET value=$1, updated_at=NOW()
    `, [JSON.stringify(meta)]).catch(()=>{});

    log(`sync complete in ${meta.duration_ms}ms — spokes:${result.spokes_updated} props:${result.props_updated} releases:${result.releases_found} enriched:${result.enriched.length}`);
    return meta;

  } catch(err) {
    log('sync failed:', err.message);
    result.errors.push(err.message);
    return result;
  }
}

// ─────────────────────────────────────────────────────────────────
// RSS FETCHER
// ─────────────────────────────────────────────────────────────────

async function fetchCommunityRSS() {
  const urls = [
    'https://www.servicenow.com/community/workflow-data-fabric-blog/bg-p/automation-engine-blog/rss',
    'https://www.servicenow.com/community/developer-blog/bg-p/developer-blog/rss',
  ];
  const releases = [];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'snspokes-bot/1.0 (+https://snspokes.com)',
          'Accept':     'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) continue;
      const xml   = await r.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      for (const [, body] of items.slice(0, 20)) {
        const title   = body.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)?.[1]?.trim()   || '';
        const link    = body.match(/<link>(.*?)<\/link>/s)?.[1]?.trim()                                || '';
        const pubDate = body.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1]?.trim()                          || '';
        const desc    = body.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/s)?.[1]
                          ?.replace(/<[^>]+>/g,'').trim().slice(0,200)                                 || '';
        if (title.toLowerCase().includes('spoke') ||
            title.toLowerCase().includes('integration hub')) {
          releases.push({ title, link, pubDate, desc });
        }
      }
    } catch {}
  }
  return releases;
}

// ─────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  server.listen(port, () => {
    console.log(`> snspokes server ready on port ${port}`);
    console.log(`> environment: ${dev ? 'development' : 'production'}`);

    // Start scheduler after server is up
    startScheduler();

    // Run initial seed on startup if DB has fewer than 10 spokes
    setTimeout(async () => {
      try {
        const { query } = require('./lib/db');
        const count = await query('SELECT COUNT(*) as c FROM sn_spokes');
        const existing = parseInt(count.rows[0]?.c || 0);
        if (existing < 10) {
          console.log('[scheduler] DB has', existing, 'spokes — running initial seed...');
          await runSync('full');
        } else {
          console.log('[scheduler] DB has', existing, 'spokes — skipping auto-seed');
        }
      } catch(e) {
        console.error('[scheduler] startup check failed:', e.message);
      }
    }, 5000); // wait 5s for DB connection to stabilise
  });
});
