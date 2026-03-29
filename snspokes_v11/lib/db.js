import { Pool } from 'pg';

let pool = null;

export function getDB() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'snspokes_db',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'snspokes',
      user: process.env.DB_USER || 'snspokes_user',
      password: process.env.DB_PASSWORD || 'Vinay@123',
      ssl: false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Pool error:', err.message);
    });
  }
  return pool;
}

export async function query(text, params = []) {
  const db = getDB();
  const start = Date.now();
  try {
    const result = await db.query(text, params);
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DB] ${text.substring(0, 60)} | ${Date.now() - start}ms`);
    }
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err.message, '\nSQL:', text.substring(0, 200));
    throw err;
  }
}

// Transaction helper
export async function transaction(fn) {
  const db = getDB();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Health check
export async function healthCheck() {
  try {
    const start = Date.now();
    await query('SELECT 1');
    return { healthy: true, latency_ms: Date.now() - start };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}
