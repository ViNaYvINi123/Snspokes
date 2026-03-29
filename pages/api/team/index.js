import { setSecurityHeaders } from '../../../lib/security';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '../../../lib/db';
import { sendWelcomeEmail } from '../../../lib/email';
import crypto from 'crypto';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const uid = session.user.id;
  const plan = session.user.plan || 'free';

  if (!['enterprise'].includes(plan)) return res.status(403).json({ error: 'Team features require Enterprise plan' });

  if (req.method === 'GET') {
    // Get or create team
    let team = await query('SELECT * FROM sn_teams WHERE owner_id=$1', [uid]);
    if (team.rows.length === 0) {
      team = await query('INSERT INTO sn_teams (owner_id, name) VALUES ($1,$2) RETURNING *', [uid, `${session.user.name || 'My'} Team`]);
    }
    const t = team.rows[0];
    const members = await query(`
      SELECT tm.*, u.email, u.name, u.plan, u.last_login
      FROM sn_team_members tm
      JOIN sn_users u ON u.id=tm.user_id
      WHERE tm.team_id=$1
      ORDER BY tm.created_at ASC
    `, [t.id]);
    const invites = await query('SELECT * FROM sn_team_invites WHERE team_id=$1 AND accepted=false AND expires_at>NOW()', [t.id]);
    return res.status(200).json({ success: true, team: t, members: members.rows, invites: invites.rows });
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    const team = await query('SELECT * FROM sn_teams WHERE owner_id=$1', [uid]);
    if (!team.rows[0]) return res.status(400).json({ error: 'No team found' });
    const teamId = team.rows[0].id;

    if (action === 'invite') {
      const { email } = req.body;
      if (!email?.trim()) return res.status(400).json({ error: 'Email required' });
      const memberCount = await query('SELECT COUNT(*) as c FROM sn_team_members WHERE team_id=$1', [teamId]);
      if (parseInt(memberCount.rows[0].c) >= 20) return res.status(400).json({ error: 'Max 20 team members' });
      const token = crypto.randomBytes(24).toString('hex');
      await query('INSERT INTO sn_team_invites (team_id, email, token, expires_at) VALUES ($1,$2,$3,NOW()+INTERVAL \'7 days\') ON CONFLICT (team_id, email) DO UPDATE SET token=$3, expires_at=NOW()+INTERVAL \'7 days\', accepted=false',
        [teamId, email.toLowerCase().trim(), token]);
      // Send invite email (simplified)
      const inviteUrl = `${process.env.NEXTAUTH_URL}/join-team?token=${token}`;
      sendTeamInviteEmail(email, session.user.name || 'Your teammate', inviteUrl).catch(() => {});
      return res.status(200).json({ success: true, invite_url: inviteUrl });
    }

    if (action === 'remove') {
      const { member_id } = req.body;
      if (member_id === uid) return res.status(400).json({ error: "Can't remove yourself" });
      await query('DELETE FROM sn_team_members WHERE team_id=$1 AND user_id=$2', [teamId, member_id]);
      // Downgrade removed member to free
      await query("UPDATE sn_users SET plan='free' WHERE id=$1", [member_id]);
      return res.status(200).json({ success: true });
    }

    if (action === 'update_name') {
      await query('UPDATE sn_teams SET name=$1 WHERE id=$2 AND owner_id=$3', [req.body.name, teamId, uid]);
      return res.status(200).json({ success: true });
    }
  }

  if (req.method === 'POST' && req.body?.action === 'accept_invite') {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'Token required' });
    try {
      const invite = await query('SELECT * FROM sn_team_invites WHERE token=$1 AND accepted=false AND expires_at>NOW()', [token]);
      if (!invite.rows[0]) return res.status(400).json({ success: false, error: 'Invalid or expired invite' });
      const inv = invite.rows[0];
      await query('INSERT INTO sn_team_members (team_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [inv.team_id, uid, 'member']);
      await query('UPDATE sn_team_invites SET accepted=true WHERE id=$1', [inv.id]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to join team' });
    }
  }

  return res.status(405).end();
}
