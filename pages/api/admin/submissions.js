import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method === 'GET') {
    const { status = 'pending' } = req.query;
    const r = await query('SELECT * FROM sn_spoke_submissions WHERE status=$1 ORDER BY created_at DESC', [status]);
    return res.status(200).json({ success: true, submissions: r.rows });
  }

  if (req.method === 'POST') {
    const { id, action, reviewer_notes } = req.body;
    if (!id || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid' });

    await query(
      'UPDATE sn_spoke_submissions SET status=$1, reviewer_notes=$2, reviewed_at=NOW() WHERE id=$3',
      [action === 'approve' ? 'approved' : 'rejected', reviewer_notes || null, id]
    );

    if (action === 'approve') {
      // Add approved spoke to main directory
      const sub = await query('SELECT * FROM sn_spoke_submissions WHERE id=$1', [id]);
      const s = sub.rows[0];
      if (s) {
        const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        await query(
          `INSERT INTO sn_spokes (slug, name, description, category, plugin_id, credential_type, min_version, is_active, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true,'community')
           ON CONFLICT (slug) DO UPDATE SET description=$3, is_active=true`,
          [slug, s.name, s.description, s.category, s.plugin_id, s.credential_type, s.min_version]
        );
        // Admin audit log
        await query('INSERT INTO sn_audit_logs (actor,action,resource,resource_id) VALUES ($1,$2,$3,$4)',
          ['admin', 'approve_submission', 'sn_spoke_submissions', id]).catch(() => {});
      }
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

export default withAdminAuth(handler);
