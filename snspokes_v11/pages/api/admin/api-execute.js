import { withAdminAuth } from '../../../lib/adminAuth';
import { executeAPI } from '../../../lib/apiEngine';
import { apiError } from '../../../lib/validate';

async function handler(req, res) {
  if (req.method !== 'POST') return apiError(res, 'Method not allowed', 405);

  const { connector_id, endpoint_id, method = 'GET', path = '/', params, body, custom_headers } = req.body;
  if (!connector_id) return apiError(res, 'Connector ID required', 400);

  try {
    const result = await executeAPI({
      connectorId: connector_id,
      endpointId: endpoint_id || null,
      method,
      path,
      params: params || {},
      body: body || null,
      customHeaders: custom_headers || {},
      triggeredBy: 'manual_test',
    });
    return res.status(200).json(result);
  } catch (err) {
    return apiError(res, 'Execution failed: ' + err.message, 500);
  }
}

export default withAdminAuth(handler);
