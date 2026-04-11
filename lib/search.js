/**
 * snspokes Search Engine
 *
 * Pure Postgres — no external dependency, always works, always fast.
 *
 * How it works:
 * 1. Full-text search  — Postgres tsvector across name, description, tags, actions
 * 2. Trigram fuzzy     — catches typos: "Gliderrecord" still finds "GlideRecord"
 * 3. Prefix match      — "slack" finds "Slack spoke", "slack OAuth"
 * 4. Ranked results    — ts_rank weights: name > category > description > tags
 * 5. View count boost  — popular spokes rank slightly higher (wisdom of crowds)
 *
 * No Elasticsearch needed. Postgres handles 50M rows at this scale.
 */

import { query } from './db';

// ── Create search indexes (run once on startup) ──────────────────────────────
export async function ensureSearchIndexes() {
  try {
    // Enable trigram extension for fuzzy matching
    await query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Full-text search index on spokes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_spokes_fts ON sn_spokes
      USING gin(
        to_tsvector('english',
          coalesce(name,'') || ' ' ||
          coalesce(description,'') || ' ' ||
          coalesce(category,'') || ' ' ||
          coalesce(official_description,'') || ' ' ||
          coalesce(ai_description,'') || ' ' ||
          coalesce(personal_tip,'') || ' ' ||
          coalesce(array_to_string(tags::text[], ' '),'')
        )
      )
    `);

    // Trigram index for fuzzy/partial matching
    await query(`CREATE INDEX IF NOT EXISTS idx_spokes_name_trgm ON sn_spokes USING gin(name gin_trgm_ops)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_spokes_desc_trgm ON sn_spokes USING gin(description gin_trgm_ops)`);

    // Full-text on API reference
    await query(`
      CREATE INDEX IF NOT EXISTS idx_api_fts ON sn_api_reference
      USING gin(
        to_tsvector('english',
          coalesce(name,'') || ' ' ||
          coalesce(description,'') || ' ' ||
          coalesce(category,'') || ' ' ||
          coalesce(global_var,'') || ' ' ||
          coalesce(gotcha,'') || ' ' ||
          coalesce(code_example,'')
        )
      )
    `);

    // Full-text on system properties
    await query(`
      CREATE INDEX IF NOT EXISTS idx_props_fts ON sn_system_properties
      USING gin(
        to_tsvector('english',
          coalesce(name,'') || ' ' ||
          coalesce(description,'') || ' ' ||
          coalesce(category,'')
        )
      )
    `);
  } catch (e) {
    // Non-fatal — search still works without indexes, just slower
    console.warn('[search] Index creation skipped:', e.message);
  }
}

// ── Main search function ─────────────────────────────────────────────────────
export async function searchAll(rawQuery, options = {}) {
  const { limit = 10, includeAPIs = true, includeProps = false } = options;

  if (!rawQuery?.trim()) return { spokes: [], apis: [], properties: [] };

  const q = rawQuery.trim();

  // Convert query to tsquery — handles multi-word, partial matches
  // "slack oauth" → "slack:* & oauth:*"
  const tsQuery = q
    .split(/\s+/)
    .filter(w => w.length > 1)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, '') + ':*')
    .join(' & ');

  if (!tsQuery) return { spokes: [], apis: [], properties: [] };

  const [spokes, apis, properties] = await Promise.allSettled([
    searchSpokes(q, tsQuery, limit),
    includeAPIs  ? searchAPIs(q, tsQuery, Math.ceil(limit / 2)) : Promise.resolve([]),
    includeProps ? searchProperties(q, tsQuery, 3)              : Promise.resolve([]),
  ]);

  return {
    spokes:     spokes.status     === 'fulfilled' ? spokes.value     : [],
    apis:       apis.status       === 'fulfilled' ? apis.value       : [],
    properties: properties.status === 'fulfilled' ? properties.value : [],
  };
}

// ── Spoke search ─────────────────────────────────────────────────────────────
async function searchSpokes(rawQ, tsQuery, limit) {
  const r = await query(`
    WITH fts AS (
      SELECT
        slug, name, description, icon, category, tags, tier,
        ai_description, setup_steps, actions, common_errors,
        view_count, plugin_id,
        -- Full-text rank (higher = better match)
        ts_rank_cd(
          setweight(to_tsvector('english', coalesce(name,'')),          'A') ||
          setweight(to_tsvector('english', coalesce(category,'')),       'B') ||
          setweight(to_tsvector('english', coalesce(description,'')),    'C') ||
          setweight(to_tsvector('english', coalesce(ai_description,'')), 'D') ||
          setweight(to_tsvector('english', coalesce(array_to_string(tags::text[],' '),'')),'D'),
          to_tsquery('english', $1),
          32  -- normalization: rank / (rank + 1) — prevents long docs dominating
        ) AS fts_rank,
        -- Trigram similarity for fuzzy matching typos
        similarity(name, $2) AS trgm_rank
      FROM sn_spokes
      WHERE is_active = true AND (
        to_tsvector('english',
          coalesce(name,'') || ' ' ||
          coalesce(description,'') || ' ' ||
          coalesce(category,'') || ' ' ||
          coalesce(ai_description,'') || ' ' ||
          coalesce(array_to_string(tags::text[],' '),'')
        ) @@ to_tsquery('english', $1)
        OR similarity(name, $2) > 0.2          -- fuzzy: catch typos
        OR LOWER(name) LIKE $3                 -- prefix: "slac" → "Slack"
        OR LOWER(description) LIKE $3
      )
    )
    SELECT *,
      -- Combined score: FTS rank + trigram bonus + popularity boost
      (fts_rank * 0.7 + trgm_rank * 0.2 + LEAST(view_count, 1000) * 0.0001) AS score
    FROM fts
    ORDER BY score DESC
    LIMIT $4
  `, [tsQuery, rawQ, `%${rawQ.toLowerCase()}%`, limit]);

  return r.rows;
}

// ── API reference search ──────────────────────────────────────────────────────
async function searchAPIs(rawQ, tsQuery, limit) {
  const r = await query(`
    SELECT
      slug, name, category, api_type, scope, global_var,
      base_path, description, gotcha, code_example,
      ts_rank(
        to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(global_var,'')),
        to_tsquery('english', $1)
      ) AS rank
    FROM sn_api_reference
    WHERE
      to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(global_var,'') || ' ' || coalesce(category,''))
      @@ to_tsquery('english', $1)
      OR LOWER(name) LIKE $2
      OR LOWER(global_var) LIKE $2
    ORDER BY rank DESC
    LIMIT $3
  `, [tsQuery, `%${rawQ.toLowerCase()}%`, limit]).catch(() => ({ rows: [] }));

  return r.rows;
}

// ── System properties search ──────────────────────────────────────────────────
async function searchProperties(rawQ, tsQuery, limit) {
  const r = await query(`
    SELECT name, description, category, default_value, type
    FROM sn_system_properties
    WHERE
      to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
      @@ to_tsquery('english', $1)
      OR LOWER(name) LIKE $2
    ORDER BY name
    LIMIT $3
  `, [tsQuery, `%${rawQ.toLowerCase()}%`, limit]).catch(() => ({ rows: [] }));

  return r.rows;
}

// ── Autocomplete suggestions ──────────────────────────────────────────────────
export async function getSuggestions(partial, limit = 6) {
  if (!partial || partial.length < 2) return [];
  const r = await query(`
    SELECT name, slug, icon, 'spoke' as type FROM sn_spokes
    WHERE LOWER(name) LIKE $1 AND is_active = true
    UNION ALL
    SELECT name, slug, '📡' as icon, 'api' as type FROM sn_api_reference
    WHERE LOWER(name) LIKE $1
    ORDER BY name
    LIMIT $2
  `, [`${partial.toLowerCase()}%`, limit]).catch(() => ({ rows: [] }));
  return r.rows;
}
