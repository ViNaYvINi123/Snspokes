import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';

async function handler(req, res) {
  if (req.method !== 'GET') return apiError(res, 'Method not allowed', 405);
  const { type = 'overview' } = req.query;

  try {
    if (type === 'overview') {
      const [apiStats, errorStats, dbStats, searchStats] = await Promise.allSettled([
        // API performance from logs
        query(`
          SELECT path, method,
            COUNT(*) as total_calls,
            AVG(duration_ms)::int as avg_ms,
            MAX(duration_ms) as max_ms,
            MIN(duration_ms) as min_ms,
            COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
            MAX(created_at) as last_called
          FROM sn_api_logs
          WHERE created_at > NOW() - INTERVAL '24 hours'
          GROUP BY path, method
          ORDER BY total_calls DESC LIMIT 20
        `).catch(() => ({ rows: [] })),

        // Error rates
        query(`
          SELECT
            COUNT(*) as total_errors,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_day,
            COUNT(CASE WHEN resolved = false THEN 1 END) as unresolved
          FROM sn_error_logs
        `).catch(() => ({ rows: [{ total_errors: 0, last_hour: 0, last_day: 0, unresolved: 0 }] })),

        // DB table sizes
        query(`
          SELECT tablename,
            pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) as size,
            pg_total_relation_size(quote_ident(tablename)) as size_bytes
          FROM pg_tables WHERE schemaname='public'
          ORDER BY size_bytes DESC LIMIT 10
        `).catch(() => ({ rows: [] })),

        // Search analytics
        query(`
          SELECT
            COUNT(*) as total_searches,
            COUNT(DISTINCT user_ip) as unique_users,
            AVG(results) as avg_results,
            COUNT(CASE WHEN results = 0 THEN 1 END) as zero_results
          FROM sn_search_analytics
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `).catch(() => ({ rows: [{}] })),
      ]);

      // Find slow APIs (>1000ms avg)
      const apiRows = apiStats.status === 'fulfilled' ? apiStats.value.rows : [];
      const slowApis = apiRows.filter(r => parseInt(r.avg_ms) > 1000);
      const failingApis = apiRows.filter(r => parseInt(r.error_count) > 0);

      return res.status(200).json({
        success: true,
        api_performance: apiRows,
        slow_apis: slowApis,
        failing_apis: failingApis,
        error_stats: errorStats.status === 'fulfilled' ? errorStats.value.rows[0] : {},
        db_sizes: dbStats.status === 'fulfilled' ? dbStats.value.rows : [],
        search_stats: searchStats.status === 'fulfilled' ? searchStats.value.rows[0] : {},
      });
    }

    if (type === 'errors') {
      const result = await query(`
        SELECT * FROM sn_error_logs
        ORDER BY created_at DESC LIMIT 50
      `).catch(() => ({ rows: [] }));
      return res.status(200).json({ success: true, errors: result.rows });
    }

    if (type === 'slow') {
      const result = await query(`
        SELECT path, method, AVG(duration_ms)::int as avg_ms, COUNT(*) as calls
        FROM sn_api_logs
        WHERE duration_ms > 500 AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY path, method
        ORDER BY avg_ms DESC LIMIT 20
      `).catch(() => ({ rows: [] }));
      return res.status(200).json({ success: true, slow_apis: result.rows });
    }

    return apiError(res, 'Unknown analyzer type', 400);
  } catch (err) {
    return apiError(res, 'Analyzer failed', 500, err.message);
  }
}

export default withAdminAuth(handler);
