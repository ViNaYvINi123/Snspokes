// ============================================================
// snspokes — Plan Limits & Rate Checking
// - getUserPlan cached in Redis (30s TTL)
// - Avoids DB hit on every search/AI request
// - Detailed limit messages
// ============================================================

import { query } from './db';
import { checkRateLimit, cacheGet, cacheSet } from './redis';

export const PLAN_LIMITS = {
  free:       { searches_per_day: 50,    ai_per_day: 10,  api_calls: 0,     code_gens_per_day: 5  },
  pro:        { searches_per_day: 2000,  ai_per_day: 100, api_calls: 10000, code_gens_per_day: 100 },
  enterprise: { searches_per_day: 99999, ai_per_day: 999, api_calls: 99999, code_gens_per_day: 999 },
};

// Cache user plan to avoid DB hit on every request
export async function getUserPlan(userId) {
  if (!userId) return 'free';

  // Check cache first
  const cacheKey = `user:plan:${userId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const r = await query('SELECT plan, is_banned, is_active FROM sn_users WHERE id=$1', [userId]);
    const user = r.rows[0];
    if (!user || !user.is_active || user.is_banned) return 'free';
    const plan = user.plan || 'free';
    // Cache for 30 seconds — keeps limits fresh without hammering DB
    await cacheSet(cacheKey, plan, 30);
    return plan;
  } catch {
    return 'free';
  }
}

// Invalidate plan cache when plan changes (call after upgrade/downgrade)
export async function invalidatePlanCache(userId) {
  const { cacheDel } = await import('./redis');
  await cacheDel(`user:plan:${userId}`);
}

export async function checkSearchLimit(userId, ip) {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const key = userId ? `search_user:${userId}` : `search_ip:${ip}`;
  const rl = await checkRateLimit(key, limits.searches_per_day, 86400);

  return {
    allowed:   rl.allowed,
    plan,
    limit:     limits.searches_per_day,
    remaining: rl.remaining,
    resetIn:   rl.resetIn,
    message:   rl.allowed ? null
      : `Daily limit of ${limits.searches_per_day} searches reached. ${plan === 'free' ? 'Upgrade to Pro for 2000/day.' : 'Resets at midnight.'}`,
  };
}

export async function checkAiLimit(userId, ip) {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const key = userId ? `ai_user:${userId}` : `ai_ip:${ip}`;
  const rl = await checkRateLimit(key, limits.ai_per_day, 86400);

  return {
    allowed:   rl.allowed,
    plan,
    limit:     limits.ai_per_day,
    remaining: rl.remaining,
    message:   rl.allowed ? null
      : `Daily AI limit of ${limits.ai_per_day} reached. ${plan === 'free' ? 'Upgrade to Pro for 100/day.' : 'Resets at midnight.'}`,
  };
}

export async function checkCodeGenLimit(userId, ip) {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const key = userId ? `codegen_user:${userId}` : `codegen_ip:${ip}`;
  const rl = await checkRateLimit(key, limits.code_gens_per_day, 86400);

  return {
    allowed:   rl.allowed,
    plan,
    limit:     limits.code_gens_per_day,
    remaining: rl.remaining,
    message:   rl.allowed ? null
      : `Daily code generation limit of ${limits.code_gens_per_day} reached. ${plan === 'free' ? 'Upgrade to Pro for 100/day.' : 'Resets at midnight.'}`,
  };
}

export async function checkApiKeyLimit(userId) {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const key = `api_key_calls:${userId}`;
  const rl = await checkRateLimit(key, limits.api_calls, 86400);
  return { allowed: rl.allowed, plan, limit: limits.api_calls, remaining: rl.remaining };
}

export async function getUserLimits(userId) {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return { plan, ...limits };
}
