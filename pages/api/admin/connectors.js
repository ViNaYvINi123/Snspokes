import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { encrypt, maskSecret } from '../../../lib/crypto';
import { apiError } from '../../../lib/validate';
import { getConnectorStats } from '../../../lib/apiEngine';
import { setSecurityHeaders } from '../../../lib/security';

const SENSITIVE_KEYS = ['api_key', 'token', 'access_token', 'client_secret', 'password'];

function maskAuthConfig(authConfig) {
  if (!authConfig) return {};
  const masked = { ...authConfig };
  SENSITIVE_KEYS.forEach(key => {
    if (masked[key]) masked[key] = maskSecret(masked[key]);
  });
  return masked;
}

function encryptAuthConfig(authConfig) {
  if (!authConfig) return {};
  const encrypted = { ...authConfig };
  SENSITIVE_KEYS.forEach(key => {
    if (encrypted[key] && !encrypted[key].includes(':')) {
      encrypted[key] = encrypt(encrypted[key]);
    }
  });
  return encrypted;
}

async function handler(req, res) {
  setSecurityHeaders(res);
  const { method } = req;

  if (method === 'GET') {
    try {
      const { id, stats } = req.query;

      if (id && stats) {
        const connectorStats = await getConnectorStats(parseInt(id));
        return res.status(200).json({ success: true, stats: connectorStats });
      }

      if (id) {
        const r = await query('SELECT * FROM sn_api_connectors WHERE id=$1', [id]);
        if (!r.rows.length) return apiError(res, 'Connector not found', 404);
        const conn = { ...r.rows[0], auth_config: maskAuthConfig(r.rows[0].auth_config) };
        const eps = await query('SELECT * FROM sn_api_endpoints WHERE connector_id=$1 ORDER BY name', [id]);
        return res.status(200).json({ success: true, connector: conn, endpoints: eps.rows });
      }

      const result = await query('SELECT * FROM sn_api_connectors ORDER BY name ASC');
      const connectors = result.rows.map(c => ({ ...c, auth_config: maskAuthConfig(c.auth_config) }));
      return res.status(200).json({ success: true, connectors });
    } catch (err) {
      return apiError(res, 'Failed to fetch connectors', 500, err.message);
    }
  }

  if (method === 'POST') {
    try {
      const { name, slug, description, base_url, auth_type, auth_config, default_headers, timeout_ms } = req.body;
      if (!name?.trim()) return apiError(res, 'Name required', 400);
      if (!base_url?.trim()) return apiError(res, 'Base URL required', 400);

      const cleanSlug = (slug || name).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const encryptedAuth = encryptAuthConfig(auth_config || {});

      const result = await query(
        `INSERT INTO sn_api_connectors (name, slug, description, base_url, auth_type, auth_config, default_headers, timeout_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, slug`,
        [name.trim(), cleanSlug, description || '', base_url.trim().replace(/\/$/, ''),
         auth_type || 'none', JSON.stringify(encryptedAuth),
         JSON.stringify(default_headers || {}), parseInt(timeout_ms) || 10000]
      );

      await query('INSERT INTO sn_audit_logs (actor,action,resource,resource_id,new_value) VALUES ($1,$2,$3,$4,$5)',
        ['admin', 'create_connector', 'api_connector', result.rows[0].id.toString(), JSON.stringify({ name, base_url })]);

      return res.status(201).json({ success: true, connector: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') return apiError(res, 'Connector with this slug already exists', 409);
      return apiError(res, 'Failed to create connector', 500, err.message);
    }
  }

  if (method === 'PUT') {
    try {
      const { id, name, description, base_url, auth_type, auth_config, default_headers, timeout_ms, is_active } = req.body;
      if (!id) return apiError(res, 'ID required', 400);

      // Get existing to preserve encrypted values
      const existing = await query('SELECT auth_config FROM sn_api_connectors WHERE id=$1', [id]);
      if (!existing.rows.length) return apiError(res, 'Connector not found', 404);

      // Only encrypt new values (preserve existing encrypted if unchanged)
      const newAuthConfig = { ...(existing.rows[0].auth_config || {}) };
      if (auth_config) {
        Object.entries(auth_config).forEach(([key, val]) => {
          if (SENSITIVE_KEYS.includes(key) && val && !val.includes('•')) {
            newAuthConfig[key] = encrypt(val);
          } else if (!SENSITIVE_KEYS.includes(key)) {
            newAuthConfig[key] = val;
          }
        });
      }

      await query(
        `UPDATE sn_api_connectors SET name=$1,description=$2,base_url=$3,auth_type=$4,auth_config=$5,default_headers=$6,timeout_ms=$7,is_active=$8,updated_at=NOW() WHERE id=$9`,
        [name, description || '', base_url.trim().replace(/\/$/, ''), auth_type || 'none',
         JSON.stringify(newAuthConfig), JSON.stringify(default_headers || {}),
         parseInt(timeout_ms) || 10000, is_active !== false, id]
      );

      return res.status(200).json({ success: true });
    } catch (err) {
      return apiError(res, 'Failed to update connector', 500, err.message);
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return apiError(res, 'ID required', 400);
      await query('DELETE FROM sn_api_connectors WHERE id=$1', [id]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return apiError(res, 'Failed to delete connector', 500, err.message);
    }
  }

  return apiError(res, 'Method not allowed', 405);
}

export default withAdminAuth(handler);
