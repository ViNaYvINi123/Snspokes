import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '../../../lib/db';
import { sanitizeString, setSecurityHeaders } from '../../../lib/security';
import { invalidatePlanCache } from '../../../lib/plans';

const SN_VERSIONS = ['Rome','San Diego','Tokyo','Utah','Vancouver','Washington DC','Xanadu','Yokohama'];
const ROLES = ['developer','architect','admin','consultant','student','other'];

export default async function handler(req, res) {
  setSecurityHeaders(res);
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ success: false, error: 'Authentication required' });
  try {
  const uid = session.user.id;

  if (req.method === 'GET') {
    const r = await query('SELECT onboarded, role, sn_version FROM sn_users WHERE id=$1', [uid]);
    return res.status(200).json({ success: true, data: r.rows[0] || {} });
  }

  if (req.method === 'POST') {
    const { role, sn_version, use_case } = req.body || {};

    // Validate against whitelist — prevent arbitrary data injection
    const cleanRole    = ROLES.includes(role) ? role : null;
    const cleanVersion = SN_VERSIONS.includes(sn_version) ? sn_version : null;
    const cleanUseCase = sanitizeString(use_case, 500);

    if (!cleanRole)    return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${ROLES.join(', ')}` });
    if (!cleanVersion) return res.status(400).json({ success: false, error: `Invalid version. Must be one of: ${SN_VERSIONS.join(', ')}` });

    await query(
      'UPDATE sn_users SET onboarded=true, role=$1, sn_version=$2, use_case=$3, onboarded_at=NOW() WHERE id=$4',
      [cleanRole, cleanVersion, cleanUseCase, uid]
    );

    // Invalidate plan cache so new session picks up changes
    await invalidatePlanCache(uid);

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error: ' + err.message });
  }
}
