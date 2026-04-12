import { query } from '../../lib/db';
import { cacheGet, cacheSet } from '../../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300');
  const cacheKey = 'global:stats';
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
  } catch {}

  try {
    const [s, a, p] = await Promise.all([
      query('SELECT COUNT(*) FROM sn_spokes'),
      query('SELECT COUNT(*) FROM sn_api_reference'),
      query('SELECT COUNT(*) FROM sn_system_properties'),
    ]);
    const data = {
      spokes:     parseInt(s.rows[0].count) || 50,
      apis:       parseInt(a.rows[0].count) || 36,
      properties: parseInt(p.rows[0].count) || 76,
    };
    await cacheSet(cacheKey, JSON.stringify(data), 300).catch(() => {});
    return res.json(data);
  } catch {
    return res.json({ spokes: 50, apis: 36, properties: 76 });
  }
}
