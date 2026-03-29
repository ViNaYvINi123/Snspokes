import { checkRateLimit, trackQuery, cacheGet, cacheSet } from '../../lib/redis';
import { searchServiceNow, isServiceNowQuery, queryCacheKey } from '../../lib/llm';
import { query as dbQuery } from '../../lib/db';
import { checkSearchLimit } from '../../lib/plans';
import { withTrace } from '../../lib/requestTrace';
import crypto from 'crypto';

export const config = { api: { bodyParser: { sizeLimit: '50kb' } } }; // request size limit

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, user_id } = req.body;
  if (!query?.trim()) return res.status(400).json({ success: false, error: 'Query is required', results: [] });

  const cleanQuery = query.trim().substring(0, 200); // cap query length
  const startTime = Date.now();
  const identifier = user_id || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous';

  // ── RATE LIMIT ──
  const rateLimit = await checkRateLimit(identifier, parseInt(process.env.RATE_LIMIT || '30'), 60);
  res.setHeader('X-RateLimit-Limit', rateLimit.max);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  if (!rateLimit.allowed) {
    return res.status(429).json({ success: false, error: `Rate limit exceeded. Try in ${rateLimit.resetIn}s.`, retry_after: rateLimit.resetIn });
  }

  // ── FREEMIUM CHECK ──
  const planCheck = await checkSearchLimit(user_id || null, identifier);
  if (!planCheck.allowed) {
    return res.status(403).json({
      success: false,
      error: planCheck.message,
      plan: planCheck.plan,
      upgrade_url: planCheck.upgrade_url,
      limit_reached: true,
    });
  }

  // ── ServiceNow validation ──
  if (!isServiceNowQuery(cleanQuery)) {
    return res.status(400).json({
      success: false,
      error: 'This platform only supports ServiceNow-related queries.',
      hint: 'Try: "How to setup Slack spoke", "GlideRecord example", "OAuth spoke configuration"',
      is_off_topic: true,
    });
  }

  // ── CACHE CHECK ──
  const cacheKey = queryCacheKey(cleanQuery, 'search');
  const cached = await cacheGet(cacheKey);
  if (cached) {
    trackQuery(cleanQuery).catch(() => {});
    return res.status(200).json({ success: true, query: cleanQuery, ...cached, cached: true, cache_hit: true, latency_ms: Date.now() - startTime });
  }

  // ── DB CACHE ──
  try {
    const hash = crypto.createHash('md5').update(cleanQuery.toLowerCase()).digest('hex');
    const dbCached = await dbQuery('SELECT response, model FROM sn_search_cache WHERE query_hash=$1 AND expires_at>NOW()', [hash]);
    if (dbCached.rows.length > 0) {
      dbQuery('UPDATE sn_search_cache SET hit_count=hit_count+1 WHERE query_hash=$1', [hash]).catch(() => {});
      return res.status(200).json({ success: true, query: cleanQuery, ...dbCached.rows[0].response, cached: true, cache_source: 'db', latency_ms: Date.now() - startTime });
    }
  } catch {}

  // ── PARALLEL: FUZZY DB SEARCH + AI ──
  const [dbResult, aiResult] = await Promise.allSettled([
    // Use pg_trgm for fuzzy matching
    dbQuery(
      `SELECT slug, name, description, icon, category, plugin_id, tags, avg_rating, rating_count,
        similarity(LOWER(name), $1) as score
       FROM sn_spokes
       WHERE similarity(LOWER(name), $1) > 0.15
          OR LOWER(name) LIKE $2
          OR LOWER(description) LIKE $2
          OR LOWER(category) LIKE $2
          OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE LOWER(t) LIKE $2)
       ORDER BY score DESC, view_count DESC LIMIT 8`,
      [cleanQuery.toLowerCase(), `%${cleanQuery.toLowerCase()}%`]
    ),
    searchServiceNow(cleanQuery),
  ]);

  const spokes = dbResult.status === 'fulfilled' ? dbResult.value.rows : [];
  const ai = aiResult.status === 'fulfilled' ? aiResult.value : null;
  const responseData = { results: spokes, ai_answer: ai, model: ai?.model };

  // ── CACHE RESULTS ──
  await cacheSet(cacheKey, responseData, 3600);
  try {
    const hash = crypto.createHash('md5').update(cleanQuery.toLowerCase()).digest('hex');
    await dbQuery(
      `INSERT INTO sn_search_cache (query_hash, query, response, model, expires_at)
       VALUES ($1,$2,$3,$4, NOW() + INTERVAL '24 hours')
       ON CONFLICT (query_hash) DO UPDATE SET response=EXCLUDED.response, expires_at=EXCLUDED.expires_at`,
      [hash, cleanQuery.toLowerCase(), JSON.stringify(responseData), ai?.model || null]
    );
  } catch {}

  // ── BACKGROUND TASKS ──
  Promise.allSettled([
    trackQuery(cleanQuery),
    dbQuery('INSERT INTO sn_search_analytics (query, user_id, results, user_ip) VALUES ($1,$2,$3,$4)', [cleanQuery.toLowerCase(), user_id || null, spokes.length, identifier]),
    user_id && dbQuery('UPDATE sn_users SET search_count=search_count+1 WHERE id=$1', [user_id]),
  ]).catch(() => {});

  return res.status(200).json({
    success: true, query: cleanQuery, ...responseData,
    cached: false, latency_ms: Date.now() - startTime,
    plan: planCheck.plan,
    ai_error: aiResult.status === 'rejected' ? aiResult.reason?.message : undefined,
  });
}

export default withTrace(handler);
