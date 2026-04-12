/**
 * Admin Intelligence API
 * What users search → what fails → what to build next
 */
import { query }             from '../../../lib/db';
import { verifyAdminToken }  from '../../../lib/adminAuth';

export default async function handler(req, res) {
  const tok = req.headers['x-admin-token'] || '';
  if (!verifyAdminToken(tok)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [
      topSearches,
      failedSearches,
      searchGaps,
      answerSources,
      avgLatency,
      topSpokes,
      dailyActivity,
    ] = await Promise.allSettled([
      // Top 15 queries last 7 days
      query(`
        SELECT query, COUNT(*) as count,
               ROUND(AVG(latency_ms)) as avg_ms,
               SUM(CASE WHEN has_result THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate
        FROM sn_search_analytics
        WHERE created_at > NOW() - INTERVAL '7 days'
          AND LENGTH(query) > 2
        GROUP BY query ORDER BY count DESC LIMIT 15
      `),
      // Queries that got no results (last 7 days)
      query(`
        SELECT query, COUNT(*) as count
        FROM sn_search_analytics
        WHERE created_at > NOW() - INTERVAL '7 days'
          AND has_result = FALSE
          AND LENGTH(query) > 2
        GROUP BY query ORDER BY count DESC LIMIT 10
      `),
      // Persistent gaps (queries never answered)
      query(`
        SELECT query, count, last_seen
        FROM sn_search_gaps
        ORDER BY count DESC LIMIT 10
      `),
      // Answer source breakdown
      query(`
        SELECT answer_source, COUNT(*) as count
        FROM sn_search_analytics
        WHERE created_at > NOW() - INTERVAL '7 days'
          AND answer_source IS NOT NULL
        GROUP BY answer_source ORDER BY count DESC
      `),
      // Average latency
      query(`
        SELECT ROUND(AVG(latency_ms)) as avg_ms,
               ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)) as p95_ms
        FROM sn_search_analytics
        WHERE created_at > NOW() - INTERVAL '24 hours'
          AND latency_ms IS NOT NULL
      `),
      // Most viewed spokes
      query(`
        SELECT name, slug, view_count, category
        FROM sn_spokes
        WHERE view_count > 0
        ORDER BY view_count DESC LIMIT 8
      `),
      // Daily search volume last 14 days
      query(`
        SELECT DATE(created_at) as day, COUNT(*) as searches,
               SUM(CASE WHEN has_result THEN 1 ELSE 0 END) as hits
        FROM sn_search_analytics
        WHERE created_at > NOW() - INTERVAL '14 days'
        GROUP BY DATE(created_at) ORDER BY day ASC
      `),
    ]);

    const extract = (r) => r.status === 'fulfilled' ? (r.value?.rows || []) : [];

    return res.status(200).json({
      top_searches:    extract(topSearches),
      failed_searches: extract(failedSearches),
      search_gaps:     extract(searchGaps),
      answer_sources:  extract(answerSources),
      latency:         extract(avgLatency)[0] || {},
      top_spokes:      extract(topSpokes),
      daily_activity:  extract(dailyActivity),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
