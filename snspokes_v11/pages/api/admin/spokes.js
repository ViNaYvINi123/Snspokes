import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { sanitizeString, sanitizePage, apiError } from '../../../lib/validate';
import logger from '../../../lib/logger';

function parseArrayField(val, fallback = []) {
  if (Array.isArray(val)) return val;
  if (!val) return fallback;
  if (typeof val === 'string') {
    return val.split('\n').map(s => s.trim()).filter(Boolean);
  }
  return fallback;
}

function parseActionsField(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  if (typeof val === 'string') {
    return val.split('\n').filter(s => s.trim()).map(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        return { name: line.substring(0, colonIdx).trim(), description: line.substring(colonIdx + 1).trim() };
      }
      return { name: line.trim(), description: '' };
    });
  }
  return [];
}

function parseErrorsField(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  if (typeof val === 'string') {
    return val.split('\n').filter(s => s.trim()).map(line => {
      const pipeIdx = line.indexOf('|');
      if (pipeIdx > 0) {
        return { error: line.substring(0, pipeIdx).trim(), fix: line.substring(pipeIdx + 1).trim() };
      }
      return { error: line.trim(), fix: '' };
    });
  }
  return [];
}

function parseTagsField(val) {
  if (Array.isArray(val)) return val.map(t => String(t).trim()).filter(Boolean);
  if (!val) return [];
  if (typeof val === 'string') return val.split(',').map(t => t.trim()).filter(Boolean);
  return [];
}

async function handler(req, res) {
  const { method } = req;

  // ── GET ──
  if (method === 'GET') {
    try {
      const { search = '', category = '' } = req.query;
      const { page, limit, offset } = sanitizePage(req.query.page, req.query.limit || 20);

      const conditions = ['1=1'];
      const params = [];

      if (search.trim()) {
        params.push(`%${search.trim().toLowerCase()}%`);
        const idx = params.length;
        conditions.push(`(LOWER(name) LIKE $${idx} OR LOWER(description) LIKE $${idx} OR LOWER(slug) LIKE $${idx} OR LOWER(category) LIKE $${idx})`);
      }
      if (category.trim()) {
        params.push(category.trim());
        conditions.push(`category = $${params.length}`);
      }

      const where = `WHERE ${conditions.join(' AND ')}`;

      const [countRes, spokesRes] = await Promise.all([
        query(`SELECT COUNT(*) as total FROM sn_spokes ${where}`, params),
        query(`SELECT id, slug, name, description, icon, category, plugin_id, credential_type, tags, view_count, created_at FROM sn_spokes ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
      ]);

      return res.status(200).json({
        success: true,
        spokes: spokesRes.rows,
        total: parseInt(countRes.rows[0].total),
        page,
        pages: Math.ceil(parseInt(countRes.rows[0].total) / limit),
      });
    } catch (err) {
      logger.error('[Spokes GET]', err.message);
      return apiError(res, 'Failed to fetch spokes', 500, err.message);
    }
  }

  // ── POST: Create ──
  if (method === 'POST') {
    try {
      const { slug, name, description, icon, category, plugin_id, credential_type,
              tags, official_description, personal_tip, ai_description,
              setup_steps, actions, common_errors, code_example } = req.body;

      if (!slug?.trim()) return apiError(res, 'Slug is required', 400);
      if (!name?.trim()) return apiError(res, 'Name is required', 400);

      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');

      const result = await query(
        `INSERT INTO sn_spokes
          (slug, name, description, official_description, personal_tip, ai_description,
           icon, plugin_id, category, credential_type, setup_steps, actions,
           common_errors, code_example, tags, view_count, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,0,NOW())
         RETURNING id, slug, name`,
        [
          cleanSlug,
          sanitizeString(name, 200).trim(),
          sanitizeString(description, 1000),
          sanitizeString(official_description, 2000),
          sanitizeString(personal_tip, 1000),
          sanitizeString(ai_description, 2000),
          icon?.trim() || '🔌',
          sanitizeString(plugin_id, 200),
          sanitizeString(category, 100) || 'Integration',
          sanitizeString(credential_type, 100) || 'OAuth 2.0',
          JSON.stringify(parseArrayField(setup_steps)),
          JSON.stringify(parseActionsField(actions)),
          JSON.stringify(parseErrorsField(common_errors)),
          sanitizeString(code_example, 5000),
          parseTagsField(tags),
        ]
      );

      query('INSERT INTO sn_admin_logs (action, target_type, target_id, details) VALUES ($1,$2,$3,$4)',
        ['create_spoke', 'spoke', result.rows[0].id.toString(), JSON.stringify({ name: name.trim(), slug: cleanSlug })]
      ).catch(() => {});

      logger.info(`[Spokes] Created: ${cleanSlug}`);
      return res.status(201).json({ success: true, spoke: result.rows[0] });

    } catch (err) {
      if (err.code === '23505') return apiError(res, 'A spoke with this slug already exists', 409);
      logger.error('[Spokes POST]', err.message);
      return apiError(res, 'Failed to create spoke', 500, err.message);
    }
  }

  // ── PUT: Update ──
  if (method === 'PUT') {
    try {
      const { id, name, description, icon, category, plugin_id, credential_type,
              tags, official_description, personal_tip, ai_description,
              setup_steps, actions, common_errors, code_example } = req.body;

      if (!id) return apiError(res, 'Spoke ID is required', 400);
      if (!name?.trim()) return apiError(res, 'Name is required', 400);

      const existing = await query('SELECT id FROM sn_spokes WHERE id = $1', [id]);
      if (existing.rows.length === 0) return apiError(res, 'Spoke not found', 404);

      await query(
        `UPDATE sn_spokes SET
          name=$1, description=$2, official_description=$3, personal_tip=$4,
          ai_description=$5, icon=$6, plugin_id=$7, category=$8, credential_type=$9,
          setup_steps=$10, actions=$11, common_errors=$12, code_example=$13,
          tags=$14, updated_at=NOW()
         WHERE id=$15`,
        [
          sanitizeString(name, 200).trim(),
          sanitizeString(description, 1000),
          sanitizeString(official_description, 2000),
          sanitizeString(personal_tip, 1000),
          sanitizeString(ai_description, 2000),
          icon?.trim() || '🔌',
          sanitizeString(plugin_id, 200),
          sanitizeString(category, 100) || 'Integration',
          sanitizeString(credential_type, 100) || 'OAuth 2.0',
          JSON.stringify(parseArrayField(setup_steps)),
          JSON.stringify(parseActionsField(actions)),
          JSON.stringify(parseErrorsField(common_errors)),
          sanitizeString(code_example, 5000),
          parseTagsField(tags),
          id,
        ]
      );

      query('INSERT INTO sn_admin_logs (action, target_type, target_id, details) VALUES ($1,$2,$3,$4)',
        ['update_spoke', 'spoke', id.toString(), JSON.stringify({ name })]
      ).catch(() => {});

      logger.info(`[Spokes] Updated ID: ${id}`);
      return res.status(200).json({ success: true, message: 'Spoke updated successfully' });

    } catch (err) {
      logger.error('[Spokes PUT]', err.message);
      return apiError(res, 'Failed to update spoke', 500, err.message);
    }
  }

  // ── DELETE ──
  if (method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return apiError(res, 'Spoke ID is required', 400);

      const existing = await query('SELECT id, slug FROM sn_spokes WHERE id = $1', [id]);
      if (existing.rows.length === 0) return apiError(res, 'Spoke not found', 404);

      await query('DELETE FROM sn_spokes WHERE id = $1', [id]);

      query('INSERT INTO sn_admin_logs (action, target_type, target_id, details) VALUES ($1,$2,$3,$4)',
        ['delete_spoke', 'spoke', id.toString(), JSON.stringify({ slug: existing.rows[0].slug })]
      ).catch(() => {});

      logger.info(`[Spokes] Deleted: ${existing.rows[0].slug}`);
      return res.status(200).json({ success: true, message: 'Spoke deleted successfully' });

    } catch (err) {
      logger.error('[Spokes DELETE]', err.message);
      return apiError(res, 'Failed to delete spoke', 500, err.message);
    }
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withAdminAuth(handler);
