// Public changelog API — reads from DB, falls back to empty
import { query } from '../../lib/db';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  try {
    const r = await query("SELECT value FROM sn_system_properties WHERE name='changelog_entries'");
    if (r.rows[0]) return res.status(200).json(JSON.parse(r.rows[0].value));
  } catch {}
  return res.status(200).json({ entries: [] }); // use hardcoded fallback in frontend
}
