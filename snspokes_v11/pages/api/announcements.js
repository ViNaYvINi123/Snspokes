import { query } from '../../lib/db';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const { plan = 'free' } = req.query;
    const result = await query(
      `SELECT id,title,message,type,cta_text,cta_url FROM sn_announcements
       WHERE is_active=true AND (target='all' OR target=$1)
       AND (ends_at IS NULL OR ends_at > NOW())
       ORDER BY created_at DESC LIMIT 3`,
      [plan]
    );
    return res.status(200).json({ success: true, announcements: result.rows });
  } catch { return res.status(200).json({ success: true, announcements: [] }); }
}
