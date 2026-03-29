// Login brute force protection
import { query } from './db';
import { checkRateLimit } from './redis';

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 30;

export async function checkLoginAllowed(identifier) {
  try {
    // Redis-based rate limit first (fast)
    const rl = await checkRateLimit(`login:${identifier}`, MAX_ATTEMPTS, WINDOW_MINUTES * 60);
    if (!rl.allowed) {
      return {
        allowed: false,
        message: `Too many login attempts. Try again in ${rl.resetIn} seconds.`,
        lockout: true,
        retry_after: rl.resetIn,
      };
    }

    // DB fallback check
    const result = await query(
      `SELECT COUNT(*) as attempts FROM sn_login_attempts
       WHERE identifier = $1 AND success = false
       AND created_at > NOW() - INTERVAL '${LOCKOUT_MINUTES} minutes'`,
      [identifier]
    );

    const attempts = parseInt(result.rows[0].attempts);
    if (attempts >= MAX_ATTEMPTS) {
      return {
        allowed: false,
        message: `Account locked for ${LOCKOUT_MINUTES} minutes due to too many failed attempts.`,
        lockout: true,
        retry_after: LOCKOUT_MINUTES * 60,
      };
    }

    return { allowed: true, attempts };
  } catch {
    return { allowed: true }; // fail open - don't block on DB error
  }
}

export async function recordLoginAttempt(identifier, success, ipAddress) {
  try {
    await query(
      'INSERT INTO sn_login_attempts (identifier, success, ip_address) VALUES ($1,$2,$3)',
      [identifier, success, ipAddress]
    );

    // Clean old records (keep 7 days)
    query(
      "DELETE FROM sn_login_attempts WHERE created_at < NOW() - INTERVAL '7 days'"
    ).catch(() => {});
  } catch {}
}

export async function getLoginAttemptStats(identifier) {
  try {
    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE success=false AND created_at > NOW() - INTERVAL '${LOCKOUT_MINUTES} minutes') as recent_failures,
        COUNT(*) FILTER (WHERE success=true) as total_successes,
        MAX(created_at) FILTER (WHERE success=true) as last_success
       FROM sn_login_attempts WHERE identifier=$1`,
      [identifier]
    );
    return result.rows[0];
  } catch {
    return {};
  }
}
