const handler = require('../../pages/api/health').default;
const { query } = require('../../lib/db');
const { cacheGet } = require('../../lib/redis');

describe('GET /api/health', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns 200 with ok status when all services healthy', async () => {
    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    cacheGet.mockResolvedValueOnce('pong');
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toHaveProperty('status');
  });

  test('returns db:false when DB is down', async () => {
    query.mockRejectedValueOnce(new Error('Connection refused'));
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body.db).toBe(false);
  });

  test('includes timestamp in response', async () => {
    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body).toHaveProperty('timestamp');
  });
});
