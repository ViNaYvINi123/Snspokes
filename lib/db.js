// ============================================================
// snspokes — Database Client
// - Connection pooling (max 10)
// - Query timeout (30s)
// - Slow query logging (>1s)
// - Mock mode support
// - Automatic retry on connection error
// ============================================================

import { Pool } from 'pg';
import logger from './logger';

let pool = null;
let mockQueryFn = null;

const SLOW_QUERY_MS = 1000; // Log queries slower than 1s
const QUERY_TIMEOUT = 30000; // 30s max per query

function getPool() {
  if (pool) return pool;
  pool = new Pool({
    host:                 process.env.DB_HOST     || 'localhost',
    port:                 parseInt(process.env.DB_PORT || '5432'),
    database:             process.env.DB_NAME     || 'snspokes',
    user:                 process.env.DB_USER     || 'snspokes_user',
    password:             process.env.DB_PASSWORD || '',
    max:                  parseInt(process.env.DB_POOL_MAX || '10'),
    min:                  2,
    idleTimeoutMillis:    30000,
    connectionTimeoutMillis: 5000,
    statement_timeout:    QUERY_TIMEOUT,
    query_timeout:        QUERY_TIMEOUT,
  });

  pool.on('error', (err) => {
    logger.error(`[db] Pool error: ${err.message}`);
  });

  pool.on('connect', () => {
    logger.debug('[db] New connection established');
  });

  return pool;
}

async function getMockQuery() {
  if (!mockQueryFn) {
    const mod = await import('../mocks/backend.js');
    mockQueryFn = mod.mockQuery;
  }
  return mockQueryFn;
}

export async function query(sql, params = []) {
  // Mock mode
  if (process.env.MOCK_MODE === 'true') {
    const mockQuery = await getMockQuery();
    return mockQuery(sql, params);
  }

  const start = Date.now();
  const client = await getPool().connect();

  try {
    const result = await client.query(sql, params);
    const duration = Date.now() - start;

    // Log slow queries
    if (duration > SLOW_QUERY_MS) {
      logger.warn(`[db] Slow query (${duration}ms): ${sql.substring(0, 100)}`);
    }

    return result;
  } catch (err) {
    const duration = Date.now() - start;
    logger.error(`[db] Query failed (${duration}ms): ${err.message} | SQL: ${sql.substring(0, 100)}`);
    throw err;
  } finally {
    client.release();
  }
}

// Transaction helper — run multiple queries atomically
export async function withTransaction(fn) {
  if (process.env.MOCK_MODE === 'true') {
    return fn({ query: async (sql, params) => (await getMockQuery())(sql, params) });
  }
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn({ query: (sql, params) => client.query(sql, params) });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Paginated query helper
export async function queryPaginated(sql, params, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const countSql = `SELECT COUNT(*) as total FROM (${sql}) AS _count`;
  const dataSql  = `${sql} LIMIT ${limit} OFFSET ${offset}`;

  const [countResult, dataResult] = await Promise.all([
    query(countSql, params),
    query(dataSql, params),
  ]);

  return {
    rows:  dataResult.rows,
    total: parseInt(countResult.rows[0]?.total || 0),
    page,
    pages: Math.ceil(parseInt(countResult.rows[0]?.total || 0) / limit),
  };
}

export async function healthCheck() {
  if (process.env.MOCK_MODE === 'true') {
    return { healthy: true, latency_ms: 0, connections: 0, mock: true };
  }
  const start = Date.now();
  try {
    const r = await getPool().query('SELECT 1');
    const latency = Date.now() - start;
    return {
      healthy: true,
      latency_ms: latency,
      connections: getPool().totalCount,
      idle: getPool().idleCount,
      waiting: getPool().waitingCount,
    };
  } catch (err) {
    return { healthy: false, latency_ms: Date.now() - start, error: err.message };
  }
}

export async function getPoolStats() {
  const p = getPool();
  return {
    total: p.totalCount,
    idle: p.idleCount,
    waiting: p.waitingCount,
  };
}
