/**
 * snspokes Sync Engine
 *
 * Three-tier sync strategy:
 *
 * Tier 1 — STATIC SEED (runs instantly, always works)
 *   Reads scripts/spoke-data.js and scripts/system-properties-data.js
 *   Upserts all 50 spokes + 76 system properties into the DB
 *   This is the foundation — real data curated from ServiceNow docs
 *
 * Tier 2 — COMMUNITY RSS (runs when reachable, ~monthly new releases)
 *   Polls ServiceNow community blog RSS for "spoke" release posts
 *   Stores release notes in sn_system_properties for display
 *   On production server this works fine; blocked in dev sandboxes
 *
 * Tier 3 — AI ENRICHMENT (runs on demand per spoke)
 *   Uses OpenRouter to generate rich descriptions, code examples,
 *   tips for any spoke that has empty ai_description / personal_tip
 *   This is how the DB stays fresh — AI fills the gaps
 */

import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import { askAI } from '../../../lib/ai';
import path from 'path';

// ── Tier 2: Fetch ServiceNow community RSS ─────────────────────
async function fetchCommunityRSS() {
  const feeds = [
    'https://www.servicenow.com/community/workflow-data-fabric-blog/bg-p/automation-engine-blog/rss',
    'https://www.servicenow.com/community/developer-blog/bg-p/developer-blog/rss',
  ];
  const releases = [];
  for (const url of feeds) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'snspokes-bot/1.0 (+https://snspokes.com)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const xml = await r.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      for (const [, body] of items.slice(0, 20)) {
        const title   = body.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)?.[1]?.trim() || '';
        const link    = body.match(/<link>(.*?)<\/link>/s)?.[1]?.trim() || '';
        const pubDate = body.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1]?.trim() || '';
        const desc    = body.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/s)?.[1]?.replace(/<[^>]+>/g,'').trim().slice(0,200) || '';
        // Only include posts about spokes/integration hub
        if (title.toLowerCase().includes('spoke') || title.toLowerCase().includes('integration hub')) {
          releases.push({ title, link, pubDate, desc, source: new URL(url).hostname });
        }
      }
    } catch {}
  }
  return releases;
}

// ── Tier 3: AI enrichment for a single spoke ──────────────────
async function enrichSpoke(spoke) {
  const prompt = `You are a ServiceNow Integration Hub expert. Write a rich, developer-focused description for the "${spoke.name}" spoke.

Return ONLY valid JSON (no markdown, no explanation):
{
  "ai_description": "2-3 sentence technical description of what this spoke does and when to use it. Focus on the developer perspective.",
  "personal_tip": "One practical tip a senior ServiceNow developer would share about this spoke — a gotcha, best practice, or performance tip.",
  "code_example": "A 4-8 line JavaScript snippet showing a typical use case with this spoke in a Flow Designer script step or Business Rule. Use realistic ServiceNow code."
}`;

  try {
    const raw = await askAI(prompt, { max_tokens: 400, temperature: 0.3 });
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      ai_description: (parsed.ai_description || '').slice(0, 800),
      personal_tip:   (parsed.personal_tip   || '').slice(0, 500),
      code_example:   (parsed.code_example   || '').slice(0, 1000),
    };
  } catch {
    return null;
  }
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { action = 'full' } = req.body || {};
  const startedAt = Date.now();
  const result = {
    action,
    started_at: new Date().toISOString(),
    spokes:        { total:0, inserted:0, updated:0, skipped:0 },
    properties:    { total:0, inserted:0, updated:0, skipped:0 },
    release_notes: [],
    enriched:      [],
    errors:        [],
  };

  // Auto-migrate schema
  try {
    await query("ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'professional'");
    await query("ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP");
    await query("ALTER TABLE sn_spokes ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT ''");
    await query("ALTER TABLE sn_system_properties ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP");
  } catch {}

  // ── TIER 1: STATIC SEED ──────────────────────────────────────
  if (['full','spokes'].includes(action)) {
    try {
      const SPOKES = require(path.join(process.cwd(), 'scripts', 'spoke-data.js'));
      result.spokes.total = SPOKES.length;

      for (const s of SPOKES) {
        try {
          const setupJson  = JSON.stringify(s.setup_steps || []);
          const actJson    = JSON.stringify((s.actions||[]).map(a => ({ name:a, description:'' })));
          const errJson    = JSON.stringify((s.common_errors||[]).map(e => {
            const [err, fix] = e.split('—');
            return { error:(err||e).trim(), fix:(fix||'').trim() };
          }));

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
          `, [s.slug, s.name, s.description, s.icon, s.category,
              s.plugin_id||'', s.credential_type||'', s.description,
              setupJson, actJson, errJson, s.tags||[],
              s.tier||'professional', s.min_version||'New York']);

          // Track insert vs update
          const existing = await query('SELECT created_at, updated_at FROM sn_spokes WHERE slug=$1', [s.slug]);
          const row = existing.rows[0];
          if (row && new Date(row.created_at).getTime() === new Date(row.updated_at).getTime()) {
            result.spokes.inserted++;
          } else {
            result.spokes.updated++;
          }
        } catch (e) {
          result.spokes.skipped++;
          result.errors.push(`spoke:${s.slug}: ${e.message.slice(0,80)}`);
        }
      }
    } catch (e) {
      result.errors.push(`Spokes load failed: ${e.message}`);
    }
  }

  // ── TIER 1: SYSTEM PROPERTIES ────────────────────────────────
  if (['full','properties'].includes(action)) {
    try {
      const PROPS = require(path.join(process.cwd(), 'scripts', 'system-properties-data.js'));
      result.properties.total = PROPS.length;

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
          result.properties.updated++;
        } catch (e) {
          result.properties.skipped++;
          result.errors.push(`prop:${p.name}: ${e.message.slice(0,60)}`);
        }
      }
      result.properties.inserted = result.properties.updated; // simplified
    } catch (e) {
      result.errors.push(`Properties load failed: ${e.message}`);
    }
  }

  // ── TIER 2: COMMUNITY RSS ────────────────────────────────────
  if (['full','release_notes'].includes(action)) {
    try {
      const notes = await fetchCommunityRSS();
      result.release_notes = notes;
      if (notes.length > 0) {
        await query(`
          INSERT INTO sn_system_properties (name, value, description, category, updated_at)
          VALUES ('sn.release_notes.latest', $1, 'SN community release notes', 'Sync', NOW())
          ON CONFLICT (name) DO UPDATE SET value=$1, updated_at=NOW()
        `, [JSON.stringify(notes.slice(0,10))]);
      }
    } catch (e) {
      result.errors.push(`RSS fetch: ${e.message.slice(0,60)}`);
    }
  }

  // ── TIER 3: AI ENRICHMENT (empty spokes only) ────────────────
  if (['full','enrich'].includes(action)) {
    try {
      // Get up to 5 spokes with empty ai_description per sync run
      const empty = await query(`
        SELECT id, slug, name, description, category FROM sn_spokes
        WHERE (ai_description IS NULL OR ai_description = '')
          AND is_active = true
        ORDER BY view_count DESC
        LIMIT 5
      `);

      for (const spoke of empty.rows) {
        const enriched = await enrichSpoke(spoke);
        if (enriched) {
          await query(`
            UPDATE sn_spokes SET
              ai_description=$2, personal_tip=$3, code_example=$4, updated_at=NOW()
            WHERE id=$1
          `, [spoke.id, enriched.ai_description, enriched.personal_tip, enriched.code_example]);
          result.enriched.push(spoke.slug);
        }
      }
    } catch (e) {
      result.errors.push(`AI enrich: ${e.message.slice(0,60)}`);
    }
  }

  // ── SAVE SYNC LOG ─────────────────────────────────────────────

    // ── Tier 1: API Reference ──────────────────────────────────
    if (['full', 'api'].includes(action)) {
      try {
        const apiDataPath = path.join(process.cwd(), 'scripts', 'sn-api-data.js');
        const { REST_APIS, SERVER_APIS, CLIENT_APIS, SCRIPTING_CONTEXTS, SCOPE_COMPARISON } = require(apiDataPath);
        const allAPIs = [
          ...REST_APIS.map(a => ({ ...a, api_type: 'rest' })),
          ...SERVER_APIS.map(a => ({ ...a, api_type: 'server' })),
          ...CLIENT_APIS.map(a => ({ ...a, api_type: 'client' })),
          ...SCRIPTING_CONTEXTS.map(a => ({ ...a, api_type: 'context' })),
        ];
        await query('CREATE TABLE IF NOT EXISTS sn_api_reference (id SERIAL PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, api_type TEXT NOT NULL, scope TEXT DEFAULT 'both', global_var TEXT, base_path TEXT, description TEXT, methods JSONB DEFAULT '[]', params JSONB DEFAULT '[]', auth JSONB DEFAULT '[]', code_example TEXT, gotcha TEXT, scoped_differences TEXT, best_practices JSONB DEFAULT '[]', available_vars JSONB DEFAULT '[]', types JSONB DEFAULT '[]', roles_required JSONB DEFAULT '[]', view_count INTEGER DEFAULT 0, last_synced_at TIMESTAMP DEFAULT NOW(), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())').catch(() => {});
        await query('CREATE TABLE IF NOT EXISTS sn_scope_comparison (id SERIAL PRIMARY KEY, topic TEXT UNIQUE NOT NULL, scoped TEXT, global_col TEXT, gotcha TEXT, created_at TIMESTAMP DEFAULT NOW())').catch(() => {});
        let apiCount = 0;
        for (const api of allAPIs) {
          try {
            await query('INSERT INTO sn_api_reference (slug,name,category,api_type,scope,global_var,base_path,description,methods,params,auth,code_example,gotcha,scoped_differences,best_practices,available_vars,types,roles_required,last_synced_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW()) ON CONFLICT (slug) DO UPDATE SET name=$2,category=$3,api_type=$4,scope=$5,global_var=$6,base_path=$7,description=$8,methods=$9,params=$10,auth=$11,code_example=$12,gotcha=$13,scoped_differences=$14,best_practices=$15,available_vars=$16,types=$17,roles_required=$18,last_synced_at=NOW(),updated_at=NOW()',
              [api.slug, api.name, api.category, api.api_type, api.scope||'both', api.global_var||'', api.base_path||'', api.description||'', JSON.stringify(api.methods||[]), JSON.stringify(api.params||[]), JSON.stringify(api.auth||[]), api.code_example||'', api.gotcha||'', api.scoped_differences||'', JSON.stringify(api.best_practices||[]), JSON.stringify(api.available_vars||[]), JSON.stringify(api.types||[]), JSON.stringify(api.roles_required||[])]);
            apiCount++;
          } catch(e) { result.errors.push('api:' + api.slug + ':' + e.message.slice(0,40)); }
        }
        for (const s of SCOPE_COMPARISON) {
          await query('INSERT INTO sn_scope_comparison (topic,scoped,global_col,gotcha) VALUES ($1,$2,$3,$4) ON CONFLICT (topic) DO UPDATE SET scoped=$2,global_col=$3,gotcha=$4', [s.topic, s.scoped, s.global, s.gotcha]).catch(() => {});
        }
        result.apis = { total: allAPIs.length, upserted: apiCount };
        log('API reference: ' + apiCount + ' entries upserted');
      } catch(e) { result.errors.push('API: ' + e.message.slice(0,80)); }
    }

    const duration = Date.now() - startedAt;
  result.duration_ms = duration;
  result.completed_at = new Date().toISOString();

  await query(`
    INSERT INTO sn_system_properties (name, value, description, category, updated_at)
    VALUES ('snspokes.last_sync', $1, 'Last sync metadata', 'Sync', NOW())
    ON CONFLICT (name) DO UPDATE SET value=$1, updated_at=NOW()
  `, [JSON.stringify({ ...result, errors: result.errors.slice(0,10) })]).catch(() => {});

  return res.status(200).json({ success: true, ...result });
}

export default withAdminAuth(handler);
