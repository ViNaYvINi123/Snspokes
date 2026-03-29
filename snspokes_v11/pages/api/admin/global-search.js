import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';

async function handler(req, res) {
  if (req.method !== 'GET') return apiError(res, 'Method not allowed', 405);

  const { q = '', type = 'all', page = 1, limit = 10 } = req.query;
  if (!q.trim() || q.trim().length < 2) return apiError(res, 'Query too short', 400);

  const search = `%${q.trim().toLowerCase()}%`;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const results = {};

  try {
    // Search in parallel across all tables
    const searches = [];

    if (type === 'all' || type === 'users') {
      searches.push(
        query(
          `SELECT 'user' as type, id::text as id, name as title, email as subtitle, created_at
           FROM sn_users WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1 LIMIT $2`,
          [search, limit]
        ).then(r => { results.users = r.rows; })
      );
    }

    if (type === 'all' || type === 'spokes') {
      searches.push(
        query(
          `SELECT 'spoke' as type, id::text as id, name as title, description as subtitle, created_at
           FROM sn_spokes WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(slug) LIKE $1 LIMIT $2`,
          [search, limit]
        ).then(r => { results.spokes = r.rows; })
      );
    }

    if (type === 'all' || type === 'properties') {
      searches.push(
        query(
          `SELECT 'property' as type, id::text as id, name as title, value as subtitle, created_at
           FROM sn_system_properties WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(value) LIKE $1 LIMIT $2`,
          [search, limit]
        ).then(r => { results.properties = r.rows; })
      );
    }

    if (type === 'all' || type === 'flags') {
      searches.push(
        query(
          `SELECT 'flag' as type, id::text as id, label as title, key as subtitle, created_at
           FROM sn_feature_flags WHERE LOWER(key) LIKE $1 OR LOWER(label) LIKE $1 LIMIT $2`,
          [search, limit]
        ).then(r => { results.flags = r.rows; })
      );
    }

    if (type === 'all' || type === 'logs') {
      searches.push(
        query(
          `SELECT 'log' as type, id::text as id, action as title, target_type as subtitle, created_at
           FROM sn_admin_logs WHERE LOWER(action) LIKE $1 OR LOWER(target_type) LIKE $1 LIMIT $2`,
          [search, limit]
        ).then(r => { results.logs = r.rows; })
      );
    }

    if (type === 'all' || type === 'errors') {
      searches.push(
        query(
          `SELECT 'error' as type, id::text as id, message as title, source as subtitle, created_at
           FROM sn_error_logs WHERE LOWER(message) LIKE $1 OR LOWER(source) LIKE $1 LIMIT $2`,
          [search, limit]
        ).catch(() => { results.errors = []; })
      );
    }

    await Promise.allSettled(searches);

    // Flatten all results for "all" type
    const flat = Object.values(results).flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({
      success: true,
      query: q.trim(),
      results: type === 'all' ? flat : results,
      counts: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.length])),
      total: flat.length,
    });
  } catch (err) {
    return apiError(res, 'Search failed', 500, err.message);
  }
}

export default withAdminAuth(handler);
