import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    const { id, stats } = req.query;
    try {
      if (id) {
        const r = await query('SELECT * FROM sn_spokes WHERE id=$1', [id]);
        if (!r.rows.length) return res.status(404).json({ success:false, error:'Not found' });
        if (stats) {
          const s = await query('SELECT COUNT(*) as calls FROM sn_search_analytics WHERE query ILIKE $1', ['%'+r.rows[0].slug+'%']);
          return res.status(200).json({ success:true, spoke:r.rows[0], stats:{ calls: parseInt(s.rows[0]?.calls||0) } });
        }
        return res.status(200).json({ success:true, spoke:r.rows[0] });
      }
      const r = await query('SELECT id,slug,name,category,icon,is_active,view_count,updated_at FROM sn_spokes ORDER BY view_count DESC LIMIT 100');
      return res.status(200).json({ success:true, connectors:r.rows });
    } catch (err) {
      return res.status(500).json({ success:false, error:err.message });
    }
  }

  if (req.method === 'PUT') {
    const { id, is_active, credential_type, plugin_id } = req.body || {};
    if (!id) return res.status(400).json({ success:false, error:'id required' });
    try {
      await query('UPDATE sn_spokes SET is_active=$1, credential_type=$2, plugin_id=$3, updated_at=NOW() WHERE id=$4',
        [is_active ?? true, credential_type||'OAuth 2.0', plugin_id||'', id]);
      return res.status(200).json({ success:true });
    } catch (err) {
      return res.status(500).json({ success:false, error:err.message });
    }
  }

  return res.status(405).json({ error:'Method not allowed' });
}

export default withAdminAuth(handler);
