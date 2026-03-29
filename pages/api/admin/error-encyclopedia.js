// Admin: Full CRUD for error encyclopedia
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import { sanitizeString } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 50, search, category } = req.query;
      const offset = (page - 1) * limit;
      const conditions = ['1=1'];
      const params = [];
      if (search) { params.push(`%${search}%`); conditions.push(`(title ILIKE $${params.length} OR error_pattern ILIKE $${params.length})`); }
      if (category) { params.push(category); conditions.push(`category=$${params.length}`); }
      const where = conditions.join(' AND ');

      const errors = await query(`SELECT * FROM sn_error_encyclopedia WHERE ${where} ORDER BY view_count DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
      const total = await query(`SELECT COUNT(*) as c FROM sn_error_encyclopedia WHERE ${where}`, params);
      const categories = await query(`SELECT DISTINCT category FROM sn_error_encyclopedia WHERE category IS NOT NULL`);

      return res.status(200).json({ success: true, errors: errors.rows, total: parseInt(total.rows[0]?.c || 0), categories: categories.rows.map(r => r.category) });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { error_pattern, title, description, root_cause, fix_steps, category, severity } = req.body;
      if (!title || !error_pattern) return res.status(400).json({ success: false, error: 'Title and error pattern required' });
      const r = await query(
        `INSERT INTO sn_error_encyclopedia (error_pattern, title, description, root_cause, fix_steps, category, severity, verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`,
        [sanitizeString(error_pattern, 500), sanitizeString(title, 500), sanitizeString(description, 2000),
         sanitizeString(root_cause, 1000), JSON.stringify(fix_steps || []), category, severity || 'medium']
      );
      return res.status(200).json({ success: true, id: r.rows[0].id });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id, error_pattern, title, description, root_cause, fix_steps, category, severity, verified } = req.body;
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });
      await query(
        `UPDATE sn_error_encyclopedia SET error_pattern=$1,title=$2,description=$3,root_cause=$4,fix_steps=$5,category=$6,severity=$7,verified=$8 WHERE id=$9`,
        [error_pattern, title, description, root_cause, JSON.stringify(fix_steps || []), category, severity, verified, id]
      );
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });
      await query('DELETE FROM sn_error_encyclopedia WHERE id=$1', [id]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
