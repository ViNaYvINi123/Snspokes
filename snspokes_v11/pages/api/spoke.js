import { cacheGet } from '../../lib/redis';
import { generateSpoke } from '../../lib/llm';
import { query } from '../../lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.body;
  if (!slug?.trim()) return res.status(400).json({ success: false, error: 'Slug required' });

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const startTime = Date.now();

  // ── CHECK DB FIRST ──
  try {
    const dbRes = await query('SELECT * FROM sn_spokes WHERE slug = $1 LIMIT 1', [cleanSlug]);
    if (dbRes.rows.length > 0) {
      const spoke = dbRes.rows[0];
      // Check if we have real AI content (not just seed data)
      const hasContent = spoke.ai_description &&
        spoke.ai_description.length > 50 &&
        Array.isArray(spoke.setup_steps) &&
        spoke.setup_steps.length > 0;

      if (hasContent) {
        // Update view count async
        query('UPDATE sn_spokes SET view_count = view_count + 1 WHERE slug = $1', [cleanSlug]).catch(() => {});
        return res.status(200).json({
          success: true, spoke, from_ai: false,
          cached: false, latency_ms: Date.now() - startTime,
        });
      }
    }
  } catch (dbErr) {
    console.error('[Spoke] DB read error:', dbErr.message);
  }

  // ── GENERATE VIA AI ──
  try {
    const spokeData = await generateSpoke(cleanSlug);

    // ── SAVE TO DB ──
    try {
      const tagsArr = Array.isArray(spokeData.tags) ? spokeData.tags : [];
      const stepsArr = Array.isArray(spokeData.setup_steps) ? spokeData.setup_steps : [];
      const actionsArr = Array.isArray(spokeData.actions) ? spokeData.actions : [];
      const errorsArr = Array.isArray(spokeData.common_errors) ? spokeData.common_errors : [];

      await query(
        `INSERT INTO sn_spokes
          (slug, name, description, official_description, personal_tip, ai_description,
           icon, plugin_id, category, credential_type, min_version,
           setup_steps, actions, common_errors, code_example, tags, view_count, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,1,NOW())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           official_description = EXCLUDED.official_description,
           personal_tip = EXCLUDED.personal_tip,
           ai_description = EXCLUDED.ai_description,
           icon = EXCLUDED.icon,
           plugin_id = EXCLUDED.plugin_id,
           category = EXCLUDED.category,
           credential_type = EXCLUDED.credential_type,
           setup_steps = EXCLUDED.setup_steps,
           actions = EXCLUDED.actions,
           common_errors = EXCLUDED.common_errors,
           code_example = EXCLUDED.code_example,
           tags = EXCLUDED.tags,
           view_count = sn_spokes.view_count + 1,
           updated_at = NOW()`,
        [
          cleanSlug,
          spokeData.name || cleanSlug,
          spokeData.description || '',
          spokeData.official_description || '',
          spokeData.personal_tip || '',
          spokeData.ai_description || '',
          spokeData.icon || '🔌',
          spokeData.plugin_id || '',
          spokeData.category || 'Integration',
          spokeData.credential_type || 'OAuth 2.0',
          spokeData.min_version || 'Rome',
          JSON.stringify(stepsArr),
          JSON.stringify(actionsArr),
          JSON.stringify(errorsArr),
          spokeData.code_example || '',
          tagsArr,
        ]
      );
      console.log(`[Spoke] Saved "${cleanSlug}" to DB`);
    } catch (saveErr) {
      console.error('[Spoke] DB save error:', saveErr.message);
      // Continue even if DB save fails - return AI data
    }

    return res.status(200).json({
      success: true,
      spoke: spokeData,
      from_ai: true,
      cached: spokeData.cached || false,
      model: spokeData.model,
      latency_ms: Date.now() - startTime,
    });

  } catch (err) {
    console.error('[Spoke] Generation error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to load spoke details. Please try again.',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }
}
