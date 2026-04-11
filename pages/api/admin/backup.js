import { withAdminAuth } from '../../../lib/adminAuth';

import { apiError } from '../../../lib/validate';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    const backups = listBackups();
    return res.status(200).json({ success: true, backups });
  }
  if (req.method === 'POST') {
    try {
      const result = { success: false, error: "Backup via pg_dump not available in this environment" };
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return apiError(res, 'Backup failed: ' + err.message, 500);
    }
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withAdminAuth(handler);
