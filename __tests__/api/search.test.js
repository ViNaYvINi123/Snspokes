const handler = require('../../pages/api/search').default;
const { query } = require('../../lib/db');
const { cacheGet, cacheSet } = require('../../lib/redis');
const { checkSearchLimit } = require('../../lib/plans');

jest.mock('../../lib/plans', () => ({
  checkSearchLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 49, resetIn: 3600 }),
  PLAN_LIMITS: { free: { searches_per_day: 50, ai_per_day: 10, api_calls: 0 } },
  getUserPlan: jest.fn().mockResolvedValue('free'),
}));

describe('GET /api/search', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns empty results for empty query', async () => {
    const req = createMockReq({ method: 'GET', query: { q: '' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toEqual([]);
  });

  test('returns cached results when available', async () => {
    const cached = { success: true, results: [{ id: 1, name: 'Slack Spoke' }], total: 1, page: 1 };
    cacheGet.mockResolvedValueOnce(JSON.stringify(cached));
    const req = createMockReq({ method: 'GET', query: { q: 'slack' } });
    const res = createMockRes();
    await handler(req, res);
    expect(cacheGet).toHaveBeenCalled();
  });

  test('returns 429 when rate limit exceeded', async () => {
    checkSearchLimit.mockResolvedValueOnce({ allowed: false, message: 'Daily limit reached', remaining: 0 });
    const req = createMockReq({ method: 'GET', query: { q: 'slack' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(429);
    expect(res.body.success).toBe(false);
  });

  test('queries DB with search term', async () => {
    cacheGet.mockResolvedValueOnce(null);
    query
      .mockResolvedValueOnce({ rows: [{ total: '2' }] })
      .mockResolvedValueOnce({ rows: [
        { id: 1, slug: 'slack-spoke', name: 'Slack Spoke', category: 'Communication', description: 'Slack integration' },
        { id: 2, slug: 'teams-spoke', name: 'Teams Spoke', category: 'Communication', description: 'Teams integration' },
      ]});
    const req = createMockReq({ method: 'GET', query: { q: 'slack' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  test('rejects non-GET requests', async () => {
    const req = createMockReq({ method: 'POST' });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  test('handles DB error gracefully', async () => {
    cacheGet.mockResolvedValueOnce(null);
    query.mockRejectedValueOnce(new Error('DB error'));
    const req = createMockReq({ method: 'GET', query: { q: 'test' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
