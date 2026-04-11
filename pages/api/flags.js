import { getAllFlags } from '../../lib/features';
import { cacheGet, cacheSet } from '../../lib/redis';
import { setSecurityHeaders } from '../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Cache-Control', 'public, max-age=60');
  if (req.method !== 'GET') return res.status(405).end();

  const cached = await cacheGet('public_flags');
  if (cached) {
    try { return res.status(200).json(JSON.parse(cached)); } catch {}
  }

  const flags = await getAllFlags();
  const data = {
    flags: flags.map(f => ({ key: f.key, enabled: f.enabled, rollout_pct: f.rollout_pct }))
  };
  await cacheSet('public_flags', JSON.stringify(data), 60).catch(() => {});
  return res.status(200).json(data);
}
