const savedQueriesHandler = require('../../pages/api/user/saved-queries').default;
const bookmarksHandler = require('../../pages/api/user/bookmarks').default;
const usageHandler = require('../../pages/api/user/usage').default;
const onboardingHandler = require('../../pages/api/user/onboarding').default;
const { query } = require('../../lib/db');

jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn().mockResolvedValue({ user: { id: 1, email: 'test@test.com', name: 'Test', plan: 'free' } }),
}));

describe('GET /api/user/saved-queries', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns user saved queries', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'My Query', query: 'active=true', table_name: 'incident' }] });
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await savedQueriesHandler(req, res);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('saves new query on POST', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'New Query', query: 'priority=1' }] });
    const req = createMockReq({ method: 'POST', body: { name: 'New Query', query: 'priority=1', table_name: 'incident' } });
    const res = createMockRes();
    await savedQueriesHandler(req, res);
    expect(res.body.success).toBe(true);
  });

  test('deletes query on DELETE', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const req = createMockReq({ method: 'DELETE', query: { id: '1' } });
    const res = createMockRes();
    await savedQueriesHandler(req, res);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/user/bookmarks', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns bookmarks with spoke details', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, spoke_slug: 'slack-spoke', name: 'Slack Spoke', category: 'Communication' }] });
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await bookmarksHandler(req, res);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('adds bookmark on POST', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const req = createMockReq({ method: 'POST', body: { spoke_slug: 'slack-spoke' } });
    const res = createMockRes();
    await bookmarksHandler(req, res);
    expect(res.body.success).toBe(true);
  });

  test('removes bookmark on DELETE', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const req = createMockReq({ method: 'DELETE', query: { id: '1' } });
    const res = createMockRes();
    await bookmarksHandler(req, res);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/user/usage', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns usage stats', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ c: '5' }] })   // code gens
      .mockResolvedValueOnce({ rows: [{ c: '20' }] });  // searches
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await usageHandler(req, res);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('usage');
    expect(res.body.usage).toHaveProperty('searches');
    expect(res.body.usage).toHaveProperty('ai_generations');
  });

  test('includes plan in response', async () => {
    query.mockResolvedValue({ rows: [{ c: '0' }] });
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await usageHandler(req, res);
    expect(res.body).toHaveProperty('plan');
  });
});

describe('POST /api/user/onboarding', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('saves onboarding data', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const req = createMockReq({ method: 'POST', body: { role: 'developer', version: 'Yokohama (2025)', goals: ['search', 'generate'] } });
    const res = createMockRes();
    await onboardingHandler(req, res);
    expect(res.body.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('onboarded'), expect.arrayContaining([1]));
  });

  test('returns 405 for GET', async () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await onboardingHandler(req, res);
    expect(res.statusCode).toBe(405);
  });
});
