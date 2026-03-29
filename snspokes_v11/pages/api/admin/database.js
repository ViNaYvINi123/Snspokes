import { withAdminAuth } from '../../../lib/adminAuth';
import { query, getDB } from '../../../lib/db';

export default withAdminAuth(async function handler(req, res) {

  if (req.method === 'GET') {
    const action = req.query.action || 'status';

    if (action === 'status') {
      try {
        const start = Date.now();
        await query('SELECT 1');
        const pingMs = Date.now() - start;
        const [tables, dbSize, connInfo] = await Promise.all([
          query(`SELECT tablename, pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) as size, pg_total_relation_size(quote_ident(tablename)) as size_bytes FROM pg_tables WHERE schemaname='public' ORDER BY size_bytes DESC`),
          query(`SELECT pg_size_pretty(pg_database_size(current_database())) as db_size, current_database() as db_name`),
          query(`SELECT count(*) as connections FROM pg_stat_activity WHERE datname = current_database()`),
        ]);
        const counts = await Promise.all([
          query('SELECT COUNT(*) as c FROM sn_users').catch(() => ({ rows: [{ c: 0 }] })),
          query('SELECT COUNT(*) as c FROM sn_spokes').catch(() => ({ rows: [{ c: 0 }] })),
          query('SELECT COUNT(*) as c FROM sn_search_analytics').catch(() => ({ rows: [{ c: 0 }] })),
          query('SELECT COUNT(*) as c FROM sn_subscriptions').catch(() => ({ rows: [{ c: 0 }] })),
          query('SELECT COUNT(*) as c FROM sn_system_properties').catch(() => ({ rows: [{ c: 0 }] })),
        ]);
        return res.status(200).json({
          success: true, status: 'connected', ping_ms: pingMs,
          db_size: dbSize.rows[0].db_size, db_name: dbSize.rows[0].db_name,
          connections: parseInt(connInfo.rows[0].connections),
          tables: tables.rows,
          counts: { users: counts[0].rows[0].c, spokes: counts[1].rows[0].c, searches: counts[2].rows[0].c, subscriptions: counts[3].rows[0].c, properties: counts[4].rows[0].c },
        });
      } catch (err) {
        return res.status(500).json({ success: false, status: 'error', error: err.message });
      }
    }

    if (action === 'query') {
      // Safe read-only queries only
      const sql = req.query.sql || '';
      const upper = sql.trim().toUpperCase();
      if (!upper.startsWith('SELECT')) return res.status(400).json({ error: 'Only SELECT queries are allowed' });
      if (upper.includes('DROP') || upper.includes('DELETE') || upper.includes('TRUNCATE')) return res.status(400).json({ error: 'Destructive queries not allowed' });
      try {
        const result = await query(sql);
        return res.status(200).json({ success: true, rows: result.rows, count: result.rowCount });
      } catch (err) { return res.status(400).json({ error: err.message }); }
    }
  }

  if (req.method === 'POST') {
    const { action, table, record } = req.body;

    if (action === 'backup_info') {
      try {
        const tables = ['sn_users', 'sn_spokes', 'sn_system_properties', 'sn_plans', 'sn_subscriptions'];
        const counts = await Promise.all(tables.map(t => query(`SELECT COUNT(*) as c FROM ${t}`).catch(() => ({ rows: [{ c: 0 }] }))));
        return res.status(200).json({ success: true, tables: tables.map((t, i) => ({ name: t, rows: counts[i].rows[0].c })) });
      } catch (err) { return res.status(500).json({ error: err.message }); }
    }

    if (action === 'run_migration') {
      const { sql } = req.body;
      if (!sql) return res.status(400).json({ error: 'SQL required' });
      try {
        await query(sql);
        await query('INSERT INTO sn_admin_logs (action, target_type, target_id, details) VALUES ($1,$2,$3,$4)', ['run_migration', 'database', 'manual', JSON.stringify({ sql: sql.substring(0, 200) })]);
        return res.status(200).json({ success: true, message: 'Migration executed successfully' });
      } catch (err) { return res.status(400).json({ error: err.message }); }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
