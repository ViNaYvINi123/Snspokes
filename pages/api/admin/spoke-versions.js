import { withAdminAuth } from '../../../lib/adminAuth';
import { getVersions, getVersion, restoreVersion } from '../../../lib/spokeVersions';
import { apiError } from '../../../lib/validate';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    const { spoke_id } = req.query;
    if (!spoke_id) return apiError(res, 'spoke_id required', 400);
    const versions = await getVersions(parseInt(spoke_id));
    return res.status(200).json({ success: true, versions });
  }
  if (req.method === 'POST') {
    const { spoke_id, version } = req.body;
    if (!spoke_id || !version) return apiError(res, 'spoke_id and version required', 400);
    try {
      await restoreVersion(parseInt(spoke_id), parseInt(version));
      return res.status(200).json({ success: true, message: `Restored to version ${version}` });
    } catch (err) {
      return apiError(res, err.message, 400);
    }
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withAdminAuth(handler);
