const { PLAN_LIMITS, getUserPlan, checkSearchLimit, checkAiLimit } = require('../../lib/plans');
const { query } = require('../../lib/db');
const { checkRateLimit } = require('../../lib/redis');

describe('PLAN_LIMITS', () => {
  test('free plan has correct limits', () => {
    expect(PLAN_LIMITS.free.searches_per_day).toBe(50);
    expect(PLAN_LIMITS.free.ai_per_day).toBe(10);
    expect(PLAN_LIMITS.free.api_calls).toBe(0);
  });
  test('pro plan has higher limits than free', () => {
    expect(PLAN_LIMITS.pro.searches_per_day).toBeGreaterThan(PLAN_LIMITS.free.searches_per_day);
    expect(PLAN_LIMITS.pro.ai_per_day).toBeGreaterThan(PLAN_LIMITS.free.ai_per_day);
  });
  test('enterprise plan has highest limits', () => {
    expect(PLAN_LIMITS.enterprise.searches_per_day).toBeGreaterThanOrEqual(PLAN_LIMITS.pro.searches_per_day);
    expect(PLAN_LIMITS.enterprise.ai_per_day).toBeGreaterThanOrEqual(PLAN_LIMITS.pro.ai_per_day);
  });
  test('all plans have required fields', () => {
    ['free', 'pro', 'enterprise'].forEach(plan => {
      expect(PLAN_LIMITS[plan]).toHaveProperty('searches_per_day');
      expect(PLAN_LIMITS[plan]).toHaveProperty('ai_per_day');
      expect(PLAN_LIMITS[plan]).toHaveProperty('api_calls');
    });
  });
});

describe('getUserPlan', () => {
  beforeEach(() => { query.mockClear(); });

  test('returns free for null userId', async () => {
    const plan = await getUserPlan(null);
    expect(plan).toBe('free');
    expect(query).not.toHaveBeenCalled();
  });

  test('returns plan from DB for valid userId', async () => {
    query.mockResolvedValueOnce({ rows: [{ plan: 'pro' }] });
    const plan = await getUserPlan(1);
    expect(plan).toBe('pro');
  });

  test('returns free if user not found', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const plan = await getUserPlan(999);
    expect(plan).toBe('free');
  });

  test('returns free on DB error', async () => {
    query.mockRejectedValueOnce(new Error('DB down'));
    const plan = await getUserPlan(1);
    expect(plan).toBe('free');
  });
});

describe('checkSearchLimit', () => {
  beforeEach(() => {
    query.mockClear();
    checkRateLimit.mockClear();
  });

  test('allows request when under limit', async () => {
    query.mockResolvedValueOnce({ rows: [{ plan: 'free' }] });
    checkRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 40, resetIn: 3600 });
    const result = await checkSearchLimit(1, '127.0.0.1');
    expect(result.allowed).toBe(true);
    expect(result.plan).toBe('free');
  });

  test('blocks request when over limit', async () => {
    query.mockResolvedValueOnce({ rows: [{ plan: 'free' }] });
    checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetIn: 1800 });
    const result = await checkSearchLimit(1, '127.0.0.1');
    expect(result.allowed).toBe(false);
    expect(result.message).toBeTruthy();
  });

  test('uses IP-based key for anonymous users', async () => {
    checkRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 50, resetIn: 3600 });
    await checkSearchLimit(null, '192.168.1.1');
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining('192.168.1.1'),
      expect.any(Number),
      expect.any(Number)
    );
  });
});
