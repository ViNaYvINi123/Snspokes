// Scheduled jobs - runs inside Next.js server (no extra infra)
// Uses simple setInterval - works fine on 4GB RAM

let cronStarted = false;

export function startCronJobs() {
  if (cronStarted || typeof window !== 'undefined') return;
  cronStarted = true;

  console.log('[Cron] Starting scheduled jobs...');

  // 1. Daily DB backup at 2 AM
  scheduleDailyAt(2, 0, async () => {
    try {
      const { runBackup } = await import('./dbBackup');
      const result = await runBackup();
      console.log('[Cron] Backup completed:', result.file);
    } catch (err) {
      console.error('[Cron] Backup failed:', err.message);
    }
  });

  // 2. Clean old logs every 6 hours
  setInterval(async () => {
    try {
      const { query } = await import('./db');
      await Promise.all([
        query("DELETE FROM sn_request_traces WHERE created_at < NOW() - INTERVAL '7 days'"),
        query("DELETE FROM sn_login_attempts WHERE created_at < NOW() - INTERVAL '7 days'"),
        query("DELETE FROM sn_search_cache WHERE expires_at < NOW()"),
        query("DELETE FROM sn_api_exec_logs WHERE created_at < NOW() - INTERVAL '30 days'"),
      ]);
      console.log('[Cron] Old logs cleaned');
    } catch {}
  }, 6 * 60 * 60 * 1000);

  // 3. Reset daily API call counters at midnight
  scheduleDailyAt(0, 0, async () => {
    try {
      const { query } = await import('./db');
      await query('UPDATE sn_users SET api_calls_today=0, api_calls_reset=NOW()');
      console.log('[Cron] Daily API counters reset');
    } catch {}
  });

  // 4. Process email queue every 5 min
  setInterval(async () => {
    try {
      const { query } = await import('./db');
      const { sendEmail } = await import('./email');
      const emails = await query(
        "SELECT * FROM sn_email_queue WHERE status='pending' AND attempts < 3 ORDER BY created_at LIMIT 10"
      );
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
    } catch {}
  }, 5 * 60 * 1000);

  console.log('[Cron] All jobs scheduled');
}

function scheduleDailyAt(hour, minute, fn) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;
  setTimeout(() => {
    fn();
    setInterval(fn, 24 * 60 * 60 * 1000);
  }, delay);
}
