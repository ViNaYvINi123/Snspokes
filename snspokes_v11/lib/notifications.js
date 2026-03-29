// Admin notification system
import { query } from './db';

export async function createNotification({ type = 'info', title, message, source = 'system', link = null }) {
  try {
    await query(
      'INSERT INTO sn_admin_notifications (type, title, message, source, link) VALUES ($1,$2,$3,$4,$5)',
      [type, title, message, source, link]
    );
  } catch {}
}

export async function getNotifications(unreadOnly = false, limit = 20) {
  try {
    const where = unreadOnly ? 'WHERE read = false' : '';
    const result = await query(
      `SELECT * FROM sn_admin_notifications ${where} ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch { return []; }
}

export async function getUnreadCount() {
  try {
    const result = await query('SELECT COUNT(*) as count FROM sn_admin_notifications WHERE read = false');
    return parseInt(result.rows[0].count);
  } catch { return 0; }
}

export async function markAllRead() {
  try {
    await query('UPDATE sn_admin_notifications SET read = true WHERE read = false');
  } catch {}
}

// Auto-notify on important events
export async function notifyNewUser(email) {
  await createNotification({ type: 'success', title: 'New user signed up', message: email, source: 'user', link: '/admin/users' });
}

export async function notifyPayment(email, plan, amount) {
  await createNotification({ type: 'success', title: `Payment received — ${plan}`, message: `${email} upgraded to ${plan} for ₹${amount}`, source: 'payment', link: '/admin/payments' });
}

export async function notifyErrorSpike(count) {
  await createNotification({ type: 'error', title: `Error spike: ${count} errors in 5 minutes`, message: 'Check logs for details', source: 'system', link: '/admin/logs' });
}

export async function notifyBackupFailed(error) {
  await createNotification({ type: 'warning', title: 'DB Backup failed', message: error, source: 'system', link: '/admin/backup' });
}

export async function notifyOllamaDown() {
  await createNotification({ type: 'warning', title: 'Ollama AI offline', message: 'Falling back to OpenRouter. Check Ollama service.', source: 'system' });
}
