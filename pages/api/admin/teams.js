import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    try {
      const teams = await query(`
        SELECT t.id, t.name, t.created_at,
               u.name as owner_name, u.email as owner_email,
               COUNT(DISTINCT tm.id) as member_count
        FROM sn_teams t
        JOIN sn_users u ON u.id = t.owner_id
        LEFT JOIN sn_team_members tm ON tm.team_id = t.id
        GROUP BY t.id, t.name, t.created_at, u.name, u.email
        ORDER BY t.created_at DESC
        LIMIT 100
      `);
      return res.status(200).json({ success: true, teams: teams.rows });
    } catch(err) { return res.status(500).json({ success: false, error: err.message }); }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'Team ID required' });
    try {
      await query('DELETE FROM sn_team_members WHERE team_id=$1', [id]);
      await query('DELETE FROM sn_teams WHERE id=$1', [id]);
      return res.status(200).json({ success: true });
    } catch(err) { return res.status(500).json({ success: false, error: err.message }); }
  }

  if (req.method === 'POST') {
    const { action, team_id, user_id } = req.body || {};
    if (action === 'remove_member') {
      if (!team_id || !user_id) return res.status(400).json({ success: false, error: 'team_id and user_id required' });
      try {
        await query('DELETE FROM sn_team_members WHERE team_id=$1 AND user_id=$2', [team_id, user_id]);
        return res.status(200).json({ success: true });
      } catch(err) { return res.status(500).json({ success: false, error: err.message }); }
    }
    return res.status(400).json({ success: false, error: 'Unknown action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
