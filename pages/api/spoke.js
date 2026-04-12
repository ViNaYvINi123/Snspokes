import { cacheGet, cacheSet } from '../../lib/redis';
import { query } from '../../lib/db';
import { askAI } from '../../lib/ai';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.body;
  if (!slug?.trim()) return res.status(400).json({ success: false, error: 'Slug required' });

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const startTime = Date.now();
  const cacheKey = `spoke:${cleanSlug}`;

  // 1. Redis cache
  const cached = await cacheGet(cacheKey);
  if (cached) {
    try { return res.status(200).json({ success: true, spoke: JSON.parse(cached), from_cache: true, latency_ms: Date.now() - startTime }); } catch {}
  }

  // 2. DB — return if has full content
  try {
    const dbRes = await query('SELECT * FROM sn_spokes WHERE slug=$1 LIMIT 1', [cleanSlug]);
    if (dbRes.rows.length > 0) {
      const spoke = dbRes.rows[0];
      // Parse JSON text fields
      try { if (typeof spoke.setup_steps === 'string') spoke.setup_steps = JSON.parse(spoke.setup_steps); } catch { spoke.setup_steps = []; }
      try { if (typeof spoke.actions === 'string') spoke.actions = JSON.parse(spoke.actions); } catch { spoke.actions = []; }
      try { if (typeof spoke.common_errors === 'string') spoke.common_errors = JSON.parse(spoke.common_errors); } catch { spoke.common_errors = []; }
      const hasContent = spoke.description?.length > 20 || (Array.isArray(spoke.setup_steps) && spoke.setup_steps.length > 0);
      if (hasContent) {
        query('UPDATE sn_spokes SET view_count=view_count+1 WHERE slug=$1', [cleanSlug]).catch(() => {});
        await cacheSet(cacheKey, JSON.stringify(spoke), 3600);
        return res.status(200).json({ success: true, spoke, from_ai: false, latency_ms: Date.now() - startTime });
      }
    }
  } catch {}

  // 3. Generate via direct AI (no n8n dependency)
  try {
    const meta = await query('SELECT name,category,plugin_id,credential_type,min_version FROM sn_spokes WHERE slug=$1', [cleanSlug]);
    const ex = meta.rows[0] || {};
    const spokeName = ex.name || cleanSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const aiResult = await askAI(
      `Generate comprehensive ServiceNow Integration Hub documentation for the "${spokeName}" spoke.`,
      {
        systemPrompt: `You are a ServiceNow Integration Hub expert. Generate spoke documentation as valid JSON only.
Return ONLY this JSON structure, no other text:
{
  "ai_description": "2-3 sentence description of what this spoke does",
  "setup_steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "actions": [{"name": "Action Name", "description": "What it does", "inputs": ["field1", "field2"], "example_code": "// code here"}],
  "authentication": {"type": "OAuth 2.0", "steps": ["step1", "step2"]},
  "best_practices": ["tip1", "tip2", "tip3"],
  "common_errors": [{"error": "common error", "fix": "how to fix it"}]
}`,
        maxTokens: 2000,
        timeout: 45000,
      }
    );

    if (!aiResult.success) {
      return res.status(200).json({
        success: true,
        spoke: {
          slug: cleanSlug, name: spokeName,
          category: ex.category || 'Integration',
          ai_description: `${spokeName} is a ServiceNow Integration Hub spoke for connecting with ${spokeName} services.`,
          setup_steps: ['Install the spoke from ServiceNow Store', 'Configure credentials in Connection & Credential Aliases', 'Test the connection using the spoke actions'],
          common_actions: [], best_practices: [], troubleshooting: [],
        },
        from_ai: false, latency_ms: Date.now() - startTime,
      });
    }

    // Parse JSON from AI response
    let spokeData = {};
    try {
      const jsonMatch = aiResult.answer.match(/\{[\s\S]*\}/);
      spokeData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {}

    const fullSpoke = {
      slug: cleanSlug,
      name: spokeName,
      category: ex.category || 'Integration',
      plugin_id: ex.plugin_id || '',
      credential_type: ex.credential_type || spokeData.authentication?.type || 'OAuth 2.0',
      min_version: ex.min_version || 'Rome',
      ...spokeData,
      actions: spokeData.actions || spokeData.common_actions || [],
      common_errors: spokeData.common_errors || spokeData.troubleshooting || [],
    };

    // Save to DB
    query(`UPDATE sn_spokes SET
      ai_description=$1, setup_steps=$2, common_actions=$3,
      authentication=$4, best_practices=$5, troubleshooting=$6,
      view_count=view_count+1, updated_at=NOW()
      WHERE slug=$7`,
      [
        fullSpoke.ai_description || '',
        JSON.stringify(fullSpoke.setup_steps || []),
        JSON.stringify(fullSpoke.actions || []),
        JSON.stringify(fullSpoke.authentication || {}),
        JSON.stringify(fullSpoke.best_practices || []),
        JSON.stringify(fullSpoke.common_errors || []),
        cleanSlug,
      ]
    ).catch(() => {});

    await cacheSet(cacheKey, JSON.stringify(fullSpoke), 3600);
    return res.status(200).json({ success: true, spoke: fullSpoke, from_ai: true, model: aiResult.model, latency_ms: Date.now() - startTime });

  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to load spoke data. Please try again.' });
  }
}
