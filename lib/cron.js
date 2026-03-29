// ============================================================
// snspokes — Scheduled Jobs
// - Daily backup at 2 AM
// - Clean old logs every 6 hours
// - Save health snapshot every hour
// - Process email queue every 5 min
// - Reset daily counters at midnight
// ============================================================

import logger from './logger';

let cronStarted = false;

export function startCronJobs() {
  if (cronStarted || typeof window !== 'undefined') return;
  if (process.env.MOCK_MODE === 'true') return; // Skip in mock mode
  cronStarted = true;

  logger.info('[cron] Starting scheduled jobs');

  // ── 1. Daily backup at 2 AM ────────────────────────────
  scheduleDailyAt(2, 0, async () => {
    logger.info('[cron] Starting daily backup');
    try {
      const { runBackup } = await import('./dbBackup');
      const result = await runBackup();
      logger.info(`[cron] Backup completed: ${result?.file || 'unknown'}`);
    } catch (err) {
      logger.error(`[cron] Backup failed: ${err.message}`);
      // Alert admin via email
      try {
        const { sendBackupAlertEmail } = await import('./email');
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
        if (adminEmail) await sendBackupAlertEmail(adminEmail, 'failed', err.message);
      } catch {}
    }
  });

  // ── 2. Clean old data every 6 hours ───────────────────
  setIntervalSafe(6 * 60 * 60 * 1000, async () => {
    try {
      const { query } = await import('./db');
      const results = await Promise.allSettled([
        query("DELETE FROM sn_request_traces WHERE created_at < NOW() - INTERVAL '7 days'"),
        query("DELETE FROM sn_login_attempts WHERE created_at < NOW() - INTERVAL '7 days'"),
        query("DELETE FROM sn_search_cache WHERE expires_at < NOW()"),
        query("DELETE FROM sn_api_exec_logs WHERE created_at < NOW() - INTERVAL '30 days'"),
        query("DELETE FROM sn_error_logs WHERE resolved=true AND resolved_at < NOW() - INTERVAL '90 days'"),
      ]);
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) logger.warn(`[cron] Log cleanup: ${failed} queries failed`);
      else logger.info('[cron] Old logs cleaned');
    } catch (err) {
      logger.error(`[cron] Log cleanup failed: ${err.message}`);
    }
  });

  // ── 3. Save health snapshot every hour ────────────────
  setIntervalSafe(60 * 60 * 1000, async () => {
    try {
      const { query } = await import('./db');
      const [activeUsers, searches, errors, connections] = await Promise.all([
        query("SELECT COUNT(*) as c FROM sn_users WHERE last_login > NOW() - INTERVAL '1 hour'"),
        query("SELECT COUNT(*) as c FROM sn_search_analytics WHERE created_at > NOW() - INTERVAL '1 hour'"),
        query("SELECT COUNT(*) as c FROM sn_error_logs WHERE created_at > NOW() - INTERVAL '1 hour' AND resolved=false"),
        query("SELECT count(*) as c FROM pg_stat_activity WHERE state='active'"),
      ]);
      await query(
        'INSERT INTO sn_health_snapshots (active_users, searches_last_hour, errors_last_hour, db_connections) VALUES ($1,$2,$3,$4)',
        [
          parseInt(activeUsers.rows[0]?.c || 0),
          parseInt(searches.rows[0]?.c || 0),
          parseInt(errors.rows[0]?.c || 0),
          parseInt(connections.rows[0]?.c || 0),
        ]
      );
      // Keep only 7 days of snapshots
      await query("DELETE FROM sn_health_snapshots WHERE created_at < NOW() - INTERVAL '7 days'");
      logger.debug('[cron] Health snapshot saved');
    } catch (err) {
      logger.warn(`[cron] Health snapshot failed: ${err.message}`);
    }
  });

  // ── 4. Process email queue every 5 min ────────────────
  setIntervalSafe(5 * 60 * 1000, async () => {
    try {
      const { query } = await import('./db');
      const { sendEmail } = await import('./email');
      const emails = await query(
        "SELECT * FROM sn_email_queue WHERE status='pending' AND attempts < 3 ORDER BY created_at LIMIT 10"
      );
      if (emails.rows.length === 0) return;

      logger.info(`[cron] Processing ${emails.rows.length} queued emails`);
      for (const email of emails.rows) {
        try {
          await sendEmail({ to: email.to_email, subject: email.subject, html: email.body_html });
          await query("UPDATE sn_email_queue SET status='sent', sent_at=NOW() WHERE id=$1", [email.id]);
        } catch (err) {
          await query(
            "UPDATE sn_email_queue SET attempts=attempts+1, error_msg=$1, status=CASE WHEN attempts+1>=3 THEN 'failed' ELSE 'pending' END WHERE id=$2",
            [err.message, email.id]
          );
        }
      }
    } catch (err) {
      logger.warn(`[cron] Email queue processing failed: ${err.message}`);
    }
  });

  // ── 5. Reset daily counters at midnight ───────────────
  scheduleDailyAt(0, 0, async () => {
    try {
      const { query } = await import('./db');
      await query('UPDATE sn_users SET api_calls_today=0, api_calls_reset=NOW() WHERE api_calls_today > 0');
      logger.info('[cron] Daily counters reset');
    } catch (err) {
      logger.error(`[cron] Counter reset failed: ${err.message}`);
    }
  });

  logger.info('[cron] All jobs scheduled ✅');
}

// ── Helpers ────────────────────────────────────────────────
function scheduleDailyAt(hour, minute, fn) {
  const now  = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;
  logger.debug(`[cron] Job scheduled for ${next.toISOString()} (in ${Math.round(delay/60000)}min)`);
  setTimeout(() => { fn(); setInterval(fn, 24 * 60 * 60 * 1000); }, delay);
}

// setInterval that catches and logs errors
function setIntervalSafe(ms, fn) {
  setInterval(async () => {
    try { await fn(); }
    catch (err) { logger.error(`[cron] Interval job error: ${err.message}`); }
  }, ms);
}
