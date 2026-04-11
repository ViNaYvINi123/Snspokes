import { withAdminAuth } from '../../../lib/adminAuth';
import { apiError } from '../../../lib/validate';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return apiError(res, 'Method not allowed', 405);

  const { connector_id, endpoint_id, method = 'GET', path = '/', params, body, custom_headers } = req.body;
  if (!connector_id) return apiError(res, 'Connector ID required', 400);

  try {
    const result = { success: false, error: "API execution not available" };
    return res.status(200).json(result);
  } catch (err) {
    return apiError(res, 'Execution failed: ' + err.message, 500);
  }
}

export default withAdminAuth(handler);
