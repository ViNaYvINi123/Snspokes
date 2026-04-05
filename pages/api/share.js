import { query } from '../../lib/db';
import { setSecurityHeaders } from '../../lib/security';
import crypto from 'crypto';

export default async function handler(req, res) {
  setSecurityHeaders(res);

  // Create shareable link
  if (req.method === 'POST') {
    const { title, code, language, description } = req.body || {};
    if (!code?.trim()) return res.status(400).json({ success: false, error: 'Code required' });
    const shareId = crypto.randomBytes(6).toString('hex');
    try {
      await query(
        'INSERT INTO sn_shared_scripts (share_id, title, code, language, description, view_count, created_at) VALUES ($1,$2,$3,$4,$5,0,NOW())',
        [shareId, (title || 'Untitled').substring(0, 200), code.substring(0, 50000), language || 'javascript', (description || '').substring(0, 500)]
      );
      return res.status(200).json({ success: true, share_id: shareId, url: `/share/${shareId}` });
    } catch (err) { return res.status(500).json({ success: false, error: 'Failed to create share link' }); }
  }

  // Get shared script
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'ID required' });
    try {
      const r = await query('SELECT * FROM sn_shared_scripts WHERE share_id=$1', [id]);
      if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
      query('UPDATE sn_shared_scripts SET view_count=view_count+1 WHERE share_id=$1', [id]).catch(() => {});
      return res.status(200).json({ success: true, script: r.rows[0] });
    } catch { return res.status(500).json({ success: false, error: 'Failed to load' }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
