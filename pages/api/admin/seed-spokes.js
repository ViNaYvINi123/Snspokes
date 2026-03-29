import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { callN8N, N8N_WEBHOOKS } from '../../../lib/n8n';
import { saveVersion } from '../../../lib/spokeVersions';
import { apiError } from '../../../lib/validate';
import logger from '../../../lib/logger';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    try {
      const result = await query(`SELECT COUNT(*) as total, COUNT(CASE WHEN LENGTH(ai_description)>50 AND setup_steps::text!='[]' THEN 1 END) as enriched, COUNT(CASE WHEN ai_description IS NULL OR LENGTH(ai_description)<=50 THEN 1 END) as needs_enrichment FROM sn_spokes`);
      const pending = await query(`SELECT id,slug,name,category FROM sn_spokes WHERE ai_description IS NULL OR LENGTH(ai_description)<=50 ORDER BY name LIMIT 10`);
      return res.status(200).json({ success: true, stats: result.rows[0], pending_sample: pending.rows });
    } catch (err) { return apiError(res, err.message, 500); }
  }

  if (req.method === 'POST') {
    const { action, slug, batch_size = 5 } = req.body;

    if (action === 'enrich_one') {
      if (!slug) return apiError(res, 'slug required', 400);
      try {
        const ex = await query('SELECT * FROM sn_spokes WHERE slug=$1', [slug]);
        if (!ex.rows.length) return apiError(res, 'Spoke not found', 404);
        const spoke = ex.rows[0];

        logger.info(`[Seeder] Enriching via n8n: ${slug}`);

        // Call n8n → OpenRouter
        const result = await callN8N(N8N_WEBHOOKS.SPOKE_GENERATE, {
          slug: spoke.slug, name: spoke.name, category: spoke.category,
          plugin_id: spoke.plugin_id, credential_type: spoke.credential_type, min_version: spoke.min_version,
        }, 120000);

        if (result.spoke && !result.saved) {
          // n8n saves it, but if it didn't, save here
          const d = result.spoke;
          await query(
            `UPDATE sn_spokes SET official_description=$1,personal_tip=$2,ai_description=$3,setup_steps=$4,actions=$5,common_errors=$6,code_example=$7,updated_at=NOW() WHERE slug=$8`,
            [d.official_description||'',d.personal_tip||'',d.ai_description||'',JSON.stringify(d.setup_steps||[]),JSON.stringify(d.actions||[]),JSON.stringify(d.common_errors||[]),d.code_example||'',slug]
          );
          await saveVersion(spoke.id, {...spoke,...d}, 'n8n', 'AI enrichment via n8n+OpenRouter');
        }

        return res.status(200).json({ success: true, message: `"${spoke.name}" enriched via n8n+OpenRouter`, model: result.model });
      } catch (err) {
        logger.error(`[Seeder] Failed ${slug}: ${err.message}`);
        return apiError(res, 'Enrichment failed: ' + err.message, 500);
      }
    }

    if (action === 'enrich_batch') {
      const limit = Math.min(parseInt(batch_size) || 5, 10);
      try {
        const pending = await query(`SELECT slug,name FROM sn_spokes WHERE ai_description IS NULL OR LENGTH(ai_description)<=50 ORDER BY name LIMIT $1`, [limit]);
        if (!pending.rows.length) return res.status(200).json({ success: true, message: 'All spokes already enriched!', enriched: 0 });

        const results = [];
        for (const row of pending.rows) {
          try {
            const ex = await query('SELECT * FROM sn_spokes WHERE slug=$1', [row.slug]);
            const spoke = ex.rows[0];
            const result = await callN8N(N8N_WEBHOOKS.SPOKE_GENERATE, {
              slug: spoke.slug, name: spoke.name, category: spoke.category,
              plugin_id: spoke.plugin_id, credential_type: spoke.credential_type, min_version: spoke.min_version,
            }, 120000);

            if (result.spoke && !result.saved) {
              const d = result.spoke;
              await query(`UPDATE sn_spokes SET official_description=$1,personal_tip=$2,ai_description=$3,setup_steps=$4,actions=$5,common_errors=$6,code_example=$7,updated_at=NOW() WHERE slug=$8`,
                [d.official_description||'',d.personal_tip||'',d.ai_description||'',JSON.stringify(d.setup_steps||[]),JSON.stringify(d.actions||[]),JSON.stringify(d.common_errors||[]),d.code_example||'',row.slug]);
            }
            results.push({ slug: row.slug, status: 'success', model: result.model });
          } catch (err) {
            results.push({ slug: row.slug, status: 'failed', error: err.message });
          }
          await new Promise(r => setTimeout(r, 1500));
        }

        const succeeded = results.filter(r => r.status === 'success').length;
        return res.status(200).json({ success: true, message: `Enriched ${succeeded}/${results.length} via n8n+OpenRouter`, enriched: succeeded, results });
      } catch (err) { return apiError(res, err.message, 500); }
    }

    return apiError(res, 'Unknown action', 400);
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withAdminAuth(handler);
