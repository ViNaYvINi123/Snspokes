import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { connector_id } = req.query;
      if (!connector_id) return apiError(res, 'Connector ID required', 400);
      const result = await query('SELECT * FROM sn_api_endpoints WHERE connector_id=$1 ORDER BY name', [connector_id]);
      return res.status(200).json({ success: true, endpoints: result.rows });
    } catch (err) { return apiError(res, 'Failed', 500, err.message); }
  }

  if (req.method === 'POST') {
    try {
      const { connector_id, name, path, method, description, params_schema, body_schema, response_map, cache_ttl } = req.body;
      if (!connector_id || !name || !path) return apiError(res, 'connector_id, name, path required', 400);
      const result = await query(
        `INSERT INTO sn_api_endpoints (connector_id, name, path, method, description, params_schema, body_schema, response_map, cache_ttl)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [connector_id, name.trim(), path.trim(), (method || 'GET').toUpperCase(),
         description || '', JSON.stringify(params_schema || {}), JSON.stringify(body_schema || {}),
         JSON.stringify(response_map || {}), parseInt(cache_ttl) || 0]
      );
      return res.status(201).json({ success: true, endpoint: result.rows[0] });
    } catch (err) { return apiError(res, 'Failed to create endpoint', 500, err.message); }
  }

  if (req.method === 'PUT') {
    try {
      const { id, name, path, method, description, params_schema, body_schema, response_map, cache_ttl, is_active } = req.body;
      if (!id) return apiError(res, 'ID required', 400);
      await query(
        `UPDATE sn_api_endpoints SET name=$1,path=$2,method=$3,description=$4,params_schema=$5,body_schema=$6,response_map=$7,cache_ttl=$8,is_active=$9 WHERE id=$10`,
        [name, path, (method || 'GET').toUpperCase(), description || '',
         JSON.stringify(params_schema || {}), JSON.stringify(body_schema || {}),
         JSON.stringify(response_map || {}), parseInt(cache_ttl) || 0, is_active !== false, id]
      );
      return res.status(200).json({ success: true });
    } catch (err) { return apiError(res, 'Failed to update', 500, err.message); }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      await query('DELETE FROM sn_api_endpoints WHERE id=$1', [id]);
      return res.status(200).json({ success: true });
    } catch (err) { return apiError(res, 'Failed', 500, err.message); }
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withAdminAuth(handler);
