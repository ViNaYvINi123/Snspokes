// Admin: IP blocking and abuse detection
import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';
import logger from '../../../lib/logger';

async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === 'GET') {
    try {
      const { view = 'blocked' } = req.query;

      if (view === 'blocked') {
        const blocked = await query('SELECT * FROM sn_ip_blocks ORDER BY created_at DESC');
        return res.status(200).json({ success: true, blocked: blocked.rows });
      }

      if (view === 'suspicious') {
        // IPs with high activity in short time = suspicious
        const suspicious = await query(`
          SELECT
            user_ip,
            COUNT(*) as total_requests,
            COUNT(DISTINCT user_id) as unique_users,
            MIN(created_at) as first_seen,
            MAX(created_at) as last_seen,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour
          FROM sn_search_analytics
          WHERE created_at > NOW() - INTERVAL '24 hours'
          GROUP BY user_ip
          HAVING COUNT(*) > 100
          ORDER BY total_requests DESC
          LIMIT 50
        `);

        // Also check login attempts
        const bruteForce = await query(`
          SELECT ip_address, COUNT(*) as attempts, COUNT(*) FILTER (WHERE success=false) as failed
          FROM sn_login_attempts
          WHERE created_at > NOW() - INTERVAL '1 hour'
          GROUP BY ip_address
          HAVING COUNT(*) FILTER (WHERE success=false) > 5
          ORDER BY failed DESC
        `);

        return res.status(200).json({ success: true, suspicious: suspicious.rows, brute_force: bruteForce.rows });
      }

      return res.status(400).json({ success: false, error: 'Invalid view' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { ip, reason, duration_hours } = req.body;
      if (!ip) return res.status(400).json({ success: false, error: 'IP required' });
      const expiresAt = duration_hours ? `NOW() + INTERVAL '${parseInt(duration_hours)} hours'` : null;
      await query(
        `INSERT INTO sn_ip_blocks (ip_address, reason, expires_at) VALUES ($1,$2,${expiresAt || 'NULL'}) ON CONFLICT (ip_address) DO UPDATE SET reason=$2, expires_at=${expiresAt || 'NULL'}, active=true`,
        [ip, reason || 'Blocked by admin']
      );
      logger.warn(`[admin] Blocked IP: ${ip} — ${reason}`);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { ip } = req.body;
      await query('UPDATE sn_ip_blocks SET active=false WHERE ip_address=$1', [ip]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withAdminAuth(handler);
