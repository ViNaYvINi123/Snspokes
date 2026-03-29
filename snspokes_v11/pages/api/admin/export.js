import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { apiError } from '../../../lib/validate';

function toCSV(rows, columns) {
  const header = columns.join(',');
  const data = rows.map(row => columns.map(col => {
    const val = row[col];
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
  }).join(',')).join('\n');
  return header + '\n' + data;
}

async function handler(req, res) {
  if (req.method !== 'GET') return apiError(res, 'Method not allowed', 405);
  const { type = 'users', format = 'csv' } = req.query;

  let rows = [], columns = [], filename = '';

  try {
    if (type === 'users') {
      const result = await query('SELECT id,name,email,plan,search_count,created_at,last_login FROM sn_users ORDER BY created_at DESC');
      rows = result.rows; columns = ['id','name','email','plan','search_count','created_at','last_login']; filename = 'users';
    } else if (type === 'payments') {
      const result = await query('SELECT id,user_id,amount,currency,status,created_at FROM sn_subscriptions ORDER BY created_at DESC');
      rows = result.rows; columns = ['id','user_id','amount','currency','status','created_at']; filename = 'payments';
    } else if (type === 'analytics') {
      const result = await query('SELECT query,results,user_ip,created_at FROM sn_search_analytics ORDER BY created_at DESC LIMIT 5000');
      rows = result.rows; columns = ['query','results','user_ip','created_at']; filename = 'analytics';
    } else if (type === 'spokes') {
      const result = await query('SELECT slug,name,category,view_count,avg_rating,rating_count,created_at FROM sn_spokes ORDER BY view_count DESC');
      rows = result.rows; columns = ['slug','name','category','view_count','avg_rating','rating_count','created_at']; filename = 'spokes';
    } else if (type === 'errors') {
      const result = await query('SELECT title,category,severity,view_count,helpful_count,created_at FROM sn_error_encyclopedia ORDER BY view_count DESC');
      rows = result.rows; columns = ['title','category','severity','view_count','helpful_count','created_at']; filename = 'error_encyclopedia';
    } else {
      return apiError(res, 'Unknown export type', 400);
    }

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(JSON.stringify(rows, null, 2));
    }

    const csv = toCSV(rows, columns);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    return res.status(200).send(csv);
  } catch (err) { return apiError(res, err.message, 500); }
}
export default withAdminAuth(handler);
