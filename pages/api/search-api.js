import { query } from '../../lib/db';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Cache-Control', 'public, max-age=300');

  const { q = '', type = '', scope = '', limit = 20 } = req.query;

  try {
    const params = [];
    let where = 'WHERE 1=1';

    if (q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      const idx = params.length;
      where += ` AND (
        LOWER(name) LIKE $${idx} OR
        LOWER(description) LIKE $${idx} OR
        LOWER(category) LIKE $${idx} OR
        LOWER(global_var) LIKE $${idx} OR
        LOWER(code_example) LIKE $${idx}
      )`;
    }

    if (type) {
      params.push(type);
      where += ` AND api_type = $${params.length}`;
    }

    if (scope) {
      params.push(scope);
      where += ` AND (scope = $${params.length} OR scope = 'both')`;
    }

    params.push(parseInt(limit) || 20);
    const limitIdx = params.length;

    const results = await query(`
      SELECT slug, name, category, api_type, scope, global_var, base_path,
             description, gotcha, code_example,
             jsonb_array_length(methods) as method_count
      FROM sn_api_reference
      ${where}
      ORDER BY
        CASE api_type
          WHEN 'rest'    THEN 1
          WHEN 'server'  THEN 2
          WHEN 'client'  THEN 3
          WHEN 'context' THEN 4
          ELSE 5
        END,
        view_count DESC
      LIMIT $${limitIdx}
    `, params);

    // Get scope comparison if searching
    let scopeComparison = [];
    if (q.trim()) {
      const sc = await query(
        `SELECT * FROM sn_scope_comparison WHERE LOWER(topic) LIKE $1 OR LOWER(scoped) LIKE $1 OR LOWER(global_col) LIKE $1 LIMIT 3`,
        [`%${q.trim().toLowerCase()}%`]
      );
      scopeComparison = sc.rows;
    }

    return res.status(200).json({
      success: true,
      results: results.rows,
      scope_comparison: scopeComparison,
      total: results.rows.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
