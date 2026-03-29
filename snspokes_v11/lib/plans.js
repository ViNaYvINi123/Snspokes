// Freemium enforcement engine
import { query } from './db';
import { cacheGet, cacheSet } from './redis';

const PLAN_LIMITS = {
  free:  { search_limit: 50,   api_keys: 0,  export: false, streaming: false, ai_search: true },
  pro:   { search_limit: 500,  api_keys: 5,  export: true,  streaming: true,  ai_search: true },
  team:  { search_limit: 5000, api_keys: 20, export: true,  streaming: true,  ai_search: true },
};

export async function getUserPlan(userId) {
  if (!userId) return { plan: 'free', ...PLAN_LIMITS.free };
  const cacheKey = `plan:${userId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const result = await query('SELECT plan FROM sn_users WHERE id=$1', [userId]);
    const plan = result.rows[0]?.plan || 'free';
    const limits = { plan, ...(PLAN_LIMITS[plan] || PLAN_LIMITS.free) };
    await cacheSet(cacheKey, limits, 300); // 5 min cache
    return limits;
  } catch {
    return { plan: 'free', ...PLAN_LIMITS.free };
  }
}

export async function checkSearchLimit(userId, identifier) {
  try {
    const planInfo = await getUserPlan(userId);

    if (userId) {
      // Check DB counter
      const result = await query(
        `SELECT COUNT(*) as count FROM sn_search_analytics
         WHERE user_id=$1 AND created_at > NOW() - INTERVAL '24 hours'`,
        [userId]
      );
      const count = parseInt(result.rows[0].count);
      if (count >= planInfo.search_limit) {
        return {
          allowed: false,
          count,
          limit: planInfo.search_limit,
          plan: planInfo.plan,
          message: `Daily search limit reached (${planInfo.search_limit}/day on ${planInfo.plan} plan). Upgrade to search more.`,
          upgrade_url: '/pricing',
        };
      }
      return { allowed: true, count, limit: planInfo.search_limit, plan: planInfo.plan };
    }

    // Anonymous: IP-based limit (20/day)
    const ipKey = `anon_search:${identifier}`;
    const cached = await cacheGet(ipKey);
    const count = (cached?.count || 0) + 1;
    if (count > 20) {
      return {
        allowed: false,
        count,
        limit: 20,
        plan: 'anonymous',
        message: 'Sign up for free to get 50 searches per day.',
        upgrade_url: '/register',
      };
    }
    await cacheSet(ipKey, { count }, 86400);
    return { allowed: true, count, limit: 20, plan: 'anonymous' };
  } catch {
    return { allowed: true, plan: 'free' }; // fail open
  }
}

export function getPlanBadge(plan) {
  const badges = {
    free: { label: 'Free', color: '#64748b', bg: '#f1f5f9' },
    pro:  { label: 'Pro',  color: '#6c63ff', bg: '#ede9fe' },
    team: { label: 'Team', color: '#059669', bg: '#dcfce7' },
  };
  return badges[plan] || badges.free;
}

export const PLANS_INFO = [
  {
    name: 'free', label: 'Free', price: '₹0', period: 'forever',
    features: ['50 searches/day','Basic AI search','Chatbot','Public spokes'],
    limits: PLAN_LIMITS.free,
  },
  {
    name: 'pro', label: 'Pro', price: '₹999', period: '/month',
    features: ['500 searches/day','Priority AI search','SSE Streaming','API Keys (5)','Export to PDF/JSON','No ads'],
    limits: PLAN_LIMITS.pro,
    popular: true,
  },
  {
    name: 'team', label: 'Team', price: '₹2,999', period: '/month',
    features: ['5000 searches/day','Everything in Pro','API Keys (20)','Priority support','Custom integrations'],
    limits: PLAN_LIMITS.team,
  },
];
