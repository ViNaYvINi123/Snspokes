import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '../../../lib/db';
import { getUserLimits } from '../../../lib/plans';
import { checkRateLimit, cacheGet, cacheSet } from '../../../lib/redis';
import { setSecurityHeaders } from '../../../lib/security';

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ success: false, error: 'Authentication required' });
  const uid = session.user.id;

  const cacheKey = `user:usage:${uid}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    try { return res.status(200).json({ ...JSON.parse(cached), cached: true }); } catch {}
  }

  const [limits, searches, codeGens, savedQueries, bookmarks] = await Promise.all([
    getUserLimits(uid),
    query('SELECT COUNT(*) as today FROM sn_search_analytics WHERE user_id=$1 AND created_at >= CURRENT_DATE', [uid]),
    query('SELECT COUNT(*) as today FROM sn_code_generations WHERE user_id=$1 AND created_at >= CURRENT_DATE', [uid]),
    query('SELECT COUNT(*) as total FROM sn_saved_queries WHERE user_id=$1', [uid]),
    query('SELECT COUNT(*) as total FROM sn_user_bookmarks WHERE user_id=$1', [uid]),
  ]);

  const result = {
    success: true,
    plan:         limits.plan,
    searches: {
      today:     parseInt(searches.rows[0]?.today || 0),
      limit:     limits.searches_per_day,
      remaining: Math.max(0, limits.searches_per_day - parseInt(searches.rows[0]?.today || 0)),
    },
    ai_generations: {
      today:     parseInt(codeGens.rows[0]?.today || 0),
      limit:     limits.ai_per_day,
      remaining: Math.max(0, limits.ai_per_day - parseInt(codeGens.rows[0]?.today || 0)),
    },
    saved_queries: parseInt(savedQueries.rows[0]?.total || 0),
    bookmarks:     parseInt(bookmarks.rows[0]?.total || 0),
  };

  await cacheSet(cacheKey, JSON.stringify(result), 60); // Cache 1 min
  return res.status(200).json(result);
}
