// Admin: Broadcast email to segmented users
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import logger from '../../../lib/logger';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    // Preview segment count before sending
    try {
      const { segment } = req.query;
      const segmentQuery = getSegmentQuery(segment);
      const count = await query(`SELECT COUNT(*) as c FROM sn_users WHERE is_active=true AND ${segmentQuery}`);
      return res.status(200).json({ success: true, count: parseInt(count.rows[0]?.c || 0) });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { subject, body, segment, schedule_at } = req.body;
      if (!subject || !body) return res.status(400).json({ success: false, error: 'Subject and body required' });

      const segmentQuery = getSegmentQuery(segment || 'all');
      const users = await query(`SELECT id, email, name FROM sn_users WHERE is_active=true AND ${segmentQuery} LIMIT 10000`);

      // Queue emails in bulk
      if (users.rows.length === 0) return res.status(400).json({ success: false, error: 'No users in segment' });

      // Insert into email queue
      const values = users.rows.map((u, i) => {
        const idx = i * 4;
        return `($${idx+1},$${idx+2},$${idx+3},$${idx+4})`;
      }).join(',');

      const params = users.rows.flatMap(u => [
        u.email,
        subject,
        body.replace('{{name}}', u.name || 'Developer'),
        schedule_at || null,
      ]);

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < users.rows.length; i += batchSize) {
        const batch = users.rows.slice(i, i + batchSize);
        await Promise.all(batch.map(u =>
          query('INSERT INTO sn_email_queue (to_email, subject, body_html, status) VALUES ($1,$2,$3,$4)',
            [u.email, subject, body.replace('{{name}}', u.name || 'Developer'), 'pending'])
        ));
      }

      // Audit log
      await query(`INSERT INTO sn_audit_logs (admin, action, target_type, target_id, details) VALUES ('admin','broadcast_email','segment',$1,$2)`,
        [segment, JSON.stringify({ subject, recipient_count: users.rows.length })]);

      logger.info(`[admin] Broadcast queued: ${users.rows.length} recipients, segment: ${segment}`);
      return res.status(200).json({ success: true, queued: users.rows.length });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

function getSegmentQuery(segment) {
  const segments = {
    all:            '1=1',
    free:           "plan='free'",
    pro:            "plan='pro'",
    enterprise:     "plan='enterprise'",
    paying:         "plan IN ('pro','enterprise')",
    inactive_30:    "last_login < NOW() - INTERVAL '30 days' OR last_login IS NULL",
    new_7:          "created_at > NOW() - INTERVAL '7 days'",
    never_searched: "id NOT IN (SELECT DISTINCT user_id FROM sn_search_analytics WHERE user_id IS NOT NULL)",
  };
  return segments[segment] || segments.all;
}

export default withAdminAuth(handler);
