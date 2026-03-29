import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  // try/catch added for error safety
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const r = await query('SELECT id,code_type,prompt,generated,model,created_at FROM sn_code_generations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30', [session.user.id]);
  return res.status(200).json({ success: true, data: r.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
