import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'POST') {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries)) return res.status(400).json({ success:false, error:'entries array required' });
      await query(
        "INSERT INTO sn_system_properties(name,value,description,updated_at) VALUES('changelog_entries',$1,'Changelog entries JSON',NOW()) ON CONFLICT(name) DO UPDATE SET value=$1,updated_at=NOW()",
        [JSON.stringify({ entries })]
      );
      return res.status(200).json({ success:true });
    } catch(err) { return res.status(500).json({ success:false, error:err.message }); }
  }
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'ID required' });
    await query('DELETE FROM sn_changelog WHERE id=$1', [id]);
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success:false, error:'Method not allowed' });
}
export default withAdminAuth(handler);
