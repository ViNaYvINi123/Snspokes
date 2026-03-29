import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ success:false });
  try {
    const teams = await query(`
      SELECT t.id, t.name, t.created_at,
             u.name as owner_name, u.email as owner_email,
             COUNT(DISTINCT tm.id) as member_count,
             COUNT(DISTINCT ti.id) FILTER(WHERE ti.accepted=false AND ti.expires_at>NOW()) as pending_invites
      FROM sn_teams t
      JOIN sn_users u ON u.id=t.owner_id
      LEFT JOIN sn_team_members tm ON tm.team_id=t.id
      LEFT JOIN sn_team_invites ti ON ti.team_id=t.id
      GROUP BY t.id,t.name,t.created_at,u.name,u.email
      ORDER BY t.created_at DESC
    `);
    return res.status(200).json({ success:true, teams: teams.rows });
  } catch(err) { return res.status(500).json({ success:false, error:err.message }); }
}
export default withAdminAuth(handler);
