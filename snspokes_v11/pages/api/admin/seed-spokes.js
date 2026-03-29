// Bulk spoke seeder + AI enricher
// Step 1: Seeds real spoke metadata from DB
// Step 2: Calls n8n/OpenRouter to generate full content for each spoke

import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { generateSpoke } from '../../../lib/llm';
import { saveVersion } from '../../../lib/spokeVersions';
import { apiError } from '../../../lib/validate';
import logger from '../../../lib/logger';
import axios from 'axios';

async function handler(req, res) {
  if (req.method === 'GET') {
    // Get seeding status
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN ai_description IS NOT NULL AND ai_description != '' AND LENGTH(ai_description) > 50 THEN 1 END) as enriched,
          COUNT(CASE WHEN ai_description IS NULL OR ai_description = '' OR LENGTH(ai_description) <= 50 THEN 1 END) as needs_enrichment
        FROM sn_spokes
      `);
      const stats = result.rows[0];
      const pendingSpokes = await query(`
        SELECT id, slug, name, category
        FROM sn_spokes
        WHERE ai_description IS NULL OR ai_description = '' OR LENGTH(ai_description) <= 50
        ORDER BY name LIMIT 10
      `);
      return res.status(200).json({
        success: true,
        stats,
        pending_sample: pendingSpokes.rows,
      });
    } catch (err) {
      return apiError(res, err.message, 500);
    }
  }

  if (req.method === 'POST') {
    const { action, slug, batch_size = 5 } = req.body;

    // Action: enrich one spoke via OpenRouter directly
    if (action === 'enrich_one') {
      if (!slug) return apiError(res, 'slug required', 400);

      try {
        // Get existing spoke info
        const existing = await query('SELECT * FROM sn_spokes WHERE slug=$1', [slug]);
        if (!existing.rows.length) return apiError(res, 'Spoke not found', 404);
        const spoke = existing.rows[0];

        logger.info(`[Seeder] Enriching spoke: ${slug}`);

        // Try n8n workflow first
        const n8nUrl = process.env.N8N_URL || 'http://snspokes_n8n:5678';
        let enriched = null;

        try {
          const n8nRes = await axios.post(
            `${n8nUrl}/webhook/sn-enrich-spoke`,
            {
              slug: spoke.slug,
              name: spoke.name,
              category: spoke.category,
              plugin_id: spoke.plugin_id,
              credential_type: spoke.credential_type,
              min_version: spoke.min_version,
            },
            { timeout: 90000 }
          );
          if (n8nRes.data?.success) {
            enriched = { source: 'n8n+openrouter', ...n8nRes.data };
          }
        } catch (n8nErr) {
          logger.warn(`[Seeder] n8n unavailable, using direct AI: ${n8nErr.message}`);
        }

        // Fallback: use direct OpenRouter/Ollama via llm.js
        if (!enriched) {
          const aiData = await generateSpoke(slug);
          if (aiData) {
            await query(
              `UPDATE sn_spokes SET
                official_description=$1, personal_tip=$2, ai_description=$3,
                setup_steps=$4, actions=$5, common_errors=$6, code_example=$7, updated_at=NOW()
               WHERE slug=$8`,
              [
                aiData.official_description || '',
                aiData.personal_tip || '',
                aiData.ai_description || '',
                JSON.stringify(aiData.setup_steps || []),
                JSON.stringify(aiData.actions || []),
                JSON.stringify(aiData.common_errors || []),
                aiData.code_example || '',
                slug,
              ]
            );

            // Save version
            await saveVersion(spoke.id, { ...spoke, ...aiData }, 'system', 'AI enrichment');

            enriched = { source: 'direct_ai', slug, name: spoke.name };
          }
        }

        if (!enriched) return apiError(res, 'All AI sources failed', 503);

        return res.status(200).json({
          success: true,
          message: `Spoke "${spoke.name}" enriched successfully`,
          ...enriched,
        });

      } catch (err) {
        logger.error(`[Seeder] Enrichment failed for ${slug}: ${err.message}`);
        return apiError(res, 'Enrichment failed: ' + err.message, 500);
      }
    }

    // Action: enrich batch of unenriched spokes
    if (action === 'enrich_batch') {
      const limit = Math.min(parseInt(batch_size) || 5, 10); // max 10 at once

      try {
        const pending = await query(
          `SELECT slug FROM sn_spokes
           WHERE ai_description IS NULL OR ai_description = '' OR LENGTH(ai_description) <= 50
           ORDER BY name LIMIT $1`,
          [limit]
        );

        if (!pending.rows.length) {
          return res.status(200).json({ success: true, message: 'All spokes already enriched!', enriched: 0 });
        }

        // Process sequentially to avoid rate limits
        const results = [];
        for (const row of pending.rows) {
          try {
            const aiData = await generateSpoke(row.slug);
            if (aiData) {
              await query(
                `UPDATE sn_spokes SET
                  official_description=$1, personal_tip=$2, ai_description=$3,
                  setup_steps=$4, actions=$5, common_errors=$6, code_example=$7, updated_at=NOW()
                 WHERE slug=$8`,
                [
                  aiData.official_description || '',
                  aiData.personal_tip || '',
                  aiData.ai_description || '',
                  JSON.stringify(aiData.setup_steps || []),
                  JSON.stringify(aiData.actions || []),
                  JSON.stringify(aiData.common_errors || []),
                  aiData.code_example || '',
                  row.slug,
                ]
              );
              results.push({ slug: row.slug, status: 'success' });
              logger.info(`[Seeder] Enriched: ${row.slug}`);
            }
          } catch (err) {
            results.push({ slug: row.slug, status: 'failed', error: err.message });
            logger.error(`[Seeder] Failed ${row.slug}: ${err.message}`);
          }

          // Small delay between calls to respect rate limits
          await new Promise(r => setTimeout(r, 2000));
        }

        const succeeded = results.filter(r => r.status === 'success').length;
        return res.status(200).json({
          success: true,
          message: `Enriched ${succeeded}/${results.length} spokes`,
          enriched: succeeded,
          results,
        });

      } catch (err) {
        return apiError(res, 'Batch enrichment failed: ' + err.message, 500);
      }
    }

    return apiError(res, 'Unknown action. Use: enrich_one, enrich_batch', 400);
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withAdminAuth(handler);
