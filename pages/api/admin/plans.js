import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

export default withAdminAuth(async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM sn_plans ORDER BY price ASC');
      return res.status(200).json({ success: true, plans: result.rows });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch plans' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, name, price, search_limit, features, is_active } = req.body;
      if (!id) return res.status(400).json({ error: 'Plan ID required' });
      const featuresArr = typeof features === 'string'
        ? features.split('\n').filter(f => f.trim())
        : features || [];
      await query(
        'UPDATE sn_plans SET name=$1, price=$2, search_limit=$3, features=$4, is_active=$5 WHERE id=$6',
        [name, parseFloat(price), parseInt(search_limit), JSON.stringify(featuresArr), is_active, id]
      );
      await query('INSERT INTO sn_admin_logs (action, target_type, target_id, details) VALUES ($1,$2,$3,$4)',
        ['update_plan', 'plan', id.toString(), JSON.stringify({ name, price })]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update plan' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'Plan ID required' });
    await query('DELETE FROM sn_plans WHERE id=$1', [id]);
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
});
