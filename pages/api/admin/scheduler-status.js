import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).end();

  try {
    // Get last sync metadata
    const rows = await query(`
      SELECT name, value, updated_at FROM sn_system_properties
      WHERE name IN ('snspokes.last_sync', 'sn.release_notes.latest')
    `);

    const meta = {};
    for (const row of rows.rows) {
      try { meta[row.name] = { value: JSON.parse(row.value), updated_at: row.updated_at }; }
      catch { meta[row.name] = { value: row.value, updated_at: row.updated_at }; }
    }

    // Get DB counts
    const [spokeCount, propCount, emptyCount] = await Promise.all([
      query('SELECT COUNT(*) as c FROM sn_spokes WHERE is_active=true'),
      query('SELECT COUNT(*) as c FROM sn_system_properties WHERE name NOT LIKE \'snspokes.%\' AND name NOT LIKE \'sn.%\''),
      query('SELECT COUNT(*) as c FROM sn_spokes WHERE (ai_description IS NULL OR ai_description = \'\') AND is_active=true'),
    ]);

    // Calculate next scheduled runs
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(24, 0, 0, 0);
    const msTo6h = (6 - (now.getUTCHours() % 6)) * 3600000 - now.getUTCMinutes() * 60000;
    const msTo4h = (4 - (now.getUTCHours() % 4)) * 3600000 - now.getUTCMinutes() * 60000;

    return res.status(200).json({
      success: true,
      last_sync: meta['snspokes.last_sync']?.value || null,
      last_sync_at: meta['snspokes.last_sync']?.updated_at || null,
      release_notes: meta['sn.release_notes.latest']?.value || [],
      release_notes_at: meta['sn.release_notes.latest']?.updated_at || null,
      db: {
        spokes:    parseInt(spokeCount.rows[0].c),
        props:     parseInt(propCount.rows[0].c),
        unenriched: parseInt(emptyCount.rows[0].c),
      },
      schedule: {
        full_sync:    { cron:'0 0 * * *',   next: nextMidnight.toISOString(),           label:'daily at midnight UTC' },
        rss_check:    { cron:'0 */6 * * *',  next: new Date(Date.now()+msTo6h).toISOString(), label:'every 6 hours' },
        ai_enrichment:{ cron:'0 */4 * * *',  next: new Date(Date.now()+msTo4h).toISOString(), label:'every 4 hours' },
      },
    });
  } catch(err) {
    return res.status(500).json({ success:false, error: err.message });
  }
}

export default withAdminAuth(handler);
