import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { askAI } from '../../../lib/ai';
import { apiError } from '../../../lib/validate';
import logger from '../../../lib/logger';
import { setSecurityHeaders } from '../../../lib/security';

async function enrichSpoke(slug, name, category) {
  const result = await askAI(
    `Generate ServiceNow Integration Hub documentation for the "${name}" spoke.`,
    {
      systemPrompt: `Return ONLY valid JSON, no other text:
{"ai_description":"string","setup_steps":["step1"],"actions":[{"name":"Action","description":"desc","inputs":[],"example_code":"// code"}],"authentication":{"type":"OAuth 2.0","steps":[]},"best_practices":["tip"],"common_errors":[{"error":"err","fix":"fix"}]}`,
      maxTokens: 2000,
      timeout: 45000,
    }
  );
  if (!result.success) return null;
  try {
    const json = result.answer.match(/\{[\s\S]*\}/)?.[0];
    return json ? { ...JSON.parse(json), model: result.model } : null;
  } catch { return null; }
}

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return apiError(res, 'POST only', 405);

  const { slug, action = 'enrich' } = req.body || {};

  if (action === 'enrich' && slug) {
    try {
      const meta = await query('SELECT name,category FROM sn_spokes WHERE slug=$1', [slug]);
      const ex = meta.rows[0];
      if (!ex) return apiError(res, 'Spoke not found', 404);

      const data = await enrichSpoke(slug, ex.name, ex.category);
      if (!data) return apiError(res, 'AI enrichment failed', 500);

      await query(`UPDATE sn_spokes SET
        ai_description=$1, setup_steps=$2, actions=$3,
        authentication=$4, best_practices=$5, common_errors=$6, updated_at=NOW()
        WHERE slug=$7`,
        [data.ai_description, JSON.stringify(data.setup_steps || []),
         JSON.stringify(data.actions || []), JSON.stringify(data.authentication || {}),
         JSON.stringify(data.best_practices || []), JSON.stringify(data.common_errors || []),
         slug]
      );
      logger.info(`[seeder] Enriched: ${slug} via ${data.model}`);
      return res.status(200).json({ success: true, message: `"${ex.name}" enriched`, model: data.model });
    } catch (err) {
      return apiError(res, 'Enrichment failed: ' + err.message, 500);
    }
  }

  if (action === 'bulk') {
    try {
      const empty = await query(`SELECT slug, name, category FROM sn_spokes WHERE (ai_description IS NULL OR ai_description='') AND is_active=true LIMIT 10`);
      if (!empty.rows.length) return res.status(200).json({ success: true, message: 'All spokes already enriched', enriched: 0 });

      let succeeded = 0;
      for (const spoke of empty.rows) {
        const data = await enrichSpoke(spoke.slug, spoke.name, spoke.category);
        if (!data) continue;
        await query(`UPDATE sn_spokes SET ai_description=$1, setup_steps=$2, actions=$3, updated_at=NOW() WHERE slug=$4`,
          [data.ai_description, JSON.stringify(data.setup_steps || []), JSON.stringify(data.actions || []), spoke.slug]
        ).catch(() => {});
        succeeded++;
      }
      return res.status(200).json({ success: true, message: `Enriched ${succeeded}/${empty.rows.length} spokes`, enriched: succeeded });
    } catch (err) {
      return apiError(res, 'Bulk enrichment failed: ' + err.message, 500);
    }
  }

  return apiError(res, 'action must be "enrich" or "bulk"', 400);
}

export default withAdminAuth(handler);
