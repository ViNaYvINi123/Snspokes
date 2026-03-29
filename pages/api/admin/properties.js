import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { sanitizeString, sanitizePage, apiError } from '../../../lib/validate';
import logger from '../../../lib/logger';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  const { method } = req;

  // ── GET: List with search, filter, pagination ──
  if (method === 'GET') {
    try {
      const { search = '', category = '' } = req.query;
      const { page, limit, offset } = sanitizePage(req.query.page, req.query.limit || 50);

      // Build WHERE clause safely
      const conditions = ['1=1'];
      const params = [];

      if (search.trim()) {
        params.push(`%${search.trim().toLowerCase()}%`);
        conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(value) LIKE $${params.length})`);
      }
      if (category.trim()) {
        params.push(category.trim());
        conditions.push(`category = $${params.length}`);
      }

      const where = `WHERE ${conditions.join(' AND ')}`;

      const [countRes, dataRes, catRes] = await Promise.all([
        query(`SELECT COUNT(*) as total FROM sn_system_properties ${where}`, params),
        query(`SELECT * FROM sn_system_properties ${where} ORDER BY category ASC, name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
        query('SELECT DISTINCT category FROM sn_system_properties ORDER BY category ASC'),
      ]);

      return res.status(200).json({
        success: true,
        properties: dataRes.rows,
        total: parseInt(countRes.rows[0].total),
        page,
        pages: Math.ceil(parseInt(countRes.rows[0].total) / limit),
        categories: catRes.rows.map(r => r.category).filter(Boolean),
      });
    } catch (err) {
      logger.error('[Properties GET]', err.message);
      return apiError(res, 'Failed to fetch properties', 500, err.message);
    }
  }

  // ── POST: Create new property ──
  if (method === 'POST') {
    try {
      const { name, value, default_value, type, category, description, ai_description } = req.body;

      // Validation
      if (!name?.trim()) return apiError(res, 'Property name is required', 400);
      if (name.trim().length < 3) return apiError(res, 'Property name must be at least 3 characters', 400);

      const validTypes = ['string', 'boolean', 'integer', 'password', 'list', 'json'];
      const propType = type && validTypes.includes(type) ? type : 'string';

      const result = await query(
        `INSERT INTO sn_system_properties
          (name, value, default_value, type, category, description, ai_description, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
         RETURNING *`,
        [
          sanitizeString(name, 200).trim(),
          sanitizeString(value, 2000),
          sanitizeString(default_value, 2000),
          propType,
          sanitizeString(category, 100) || 'General',
          sanitizeString(description, 1000),
          sanitizeString(ai_description, 2000),
        ]
      );

      // Log async
      query('INSERT INTO sn_admin_logs (action, target_type, target_id, details) VALUES ($1,$2,$3,$4)',
        ['create_property', 'property', result.rows[0].id.toString(), JSON.stringify({ name: name.trim() })]
      ).catch(() => {});

      logger.info(`[Properties] Created: ${name.trim()}`);
      return res.status(201).json({ success: true, property: result.rows[0] });

    } catch (err) {
      if (err.code === '23505') return apiError(res, 'A property with this name already exists', 409);
      logger.error('[Properties POST]', err.message);
      return apiError(res, 'Failed to create property', 500, err.message);
    }
  }

  // ── PUT: Update property ──
  if (method === 'PUT') {
    try {
      const { id, name, value, default_value, type, category, description, ai_description, is_active } = req.body;

      if (!id) return apiError(res, 'Property ID is required', 400);
      if (!name?.trim()) return apiError(res, 'Property name is required', 400);

      // Check exists
      const existing = await query('SELECT id FROM sn_system_properties WHERE id = $1', [id]);
      if (existing.rows.length === 0) return apiError(res, 'Property not found', 404);

      const validTypes = ['string', 'boolean', 'integer', 'password', 'list', 'json'];
      const propType = type && validTypes.includes(type) ? type : 'string';

      await query(
        `UPDATE sn_system_properties SET
          name=$1, value=$2, default_value=$3, type=$4, category=$5,
          description=$6, ai_description=$7, is_active=$8, updated_at=NOW()
         WHERE id=$9`,
        [
          sanitizeString(name, 200).trim(),
          sanitizeString(value, 2000),
          sanitizeString(default_value, 2000),
          propType,
          sanitizeString(category, 100) || 'General',
          sanitizeString(description, 1000),
          sanitizeString(ai_description, 2000),
          is_active !== false,
          id,
        ]
      );

      query('INSERT INTO sn_admin_logs (action, target_type, target_id, details) VALUES ($1,$2,$3,$4)',
        ['update_property', 'property', id.toString(), JSON.stringify({ name, value })]
      ).catch(() => {});

      logger.info(`[Properties] Updated ID: ${id}`);
      return res.status(200).json({ success: true, message: 'Property updated successfully' });

    } catch (err) {
      if (err.code === '23505') return apiError(res, 'A property with this name already exists', 409);
      logger.error('[Properties PUT]', err.message);
      return apiError(res, 'Failed to update property', 500, err.message);
    }
  }

  // ── DELETE ──
  if (method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return apiError(res, 'Property ID is required', 400);

      const existing = await query('SELECT id, name FROM sn_system_properties WHERE id = $1', [id]);
      if (existing.rows.length === 0) return apiError(res, 'Property not found', 404);

      await query('DELETE FROM sn_system_properties WHERE id = $1', [id]);

      query('INSERT INTO sn_admin_logs (action, target_type, target_id, details) VALUES ($1,$2,$3,$4)',
        ['delete_property', 'property', id.toString(), JSON.stringify({ name: existing.rows[0].name })]
      ).catch(() => {});

      logger.info(`[Properties] Deleted ID: ${id}`);
      return res.status(200).json({ success: true, message: 'Property deleted successfully' });

    } catch (err) {
      logger.error('[Properties DELETE]', err.message);
      return apiError(res, 'Failed to delete property', 500, err.message);
    }
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withAdminAuth(handler);
