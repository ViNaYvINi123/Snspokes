import { withAdminAuth } from '../../../lib/adminAuth';
import { runBackup, listBackups } from '../../../lib/dbBackup';
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
      const result = await runBackup();
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return apiError(res, 'Backup failed: ' + err.message, 500);
    }
  }
  return apiError(res, 'Method not allowed', 405);
}
export default withAdminAuth(handler);
