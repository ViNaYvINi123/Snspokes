const statsHandler = require('../../pages/api/admin/stats').default;
const submissionsHandler = require('../../pages/api/admin/submissions').default;
const { query } = require('../../lib/db');

describe('GET /api/admin/stats', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns system stats', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ total: '100' }] })  // users
      .mockResolvedValueOnce({ rows: [{ total: '500' }] })  // spokes
      .mockResolvedValueOnce({ rows: [{ total: '1000' }] }) // searches
      .mockResolvedValueOnce({ rows: [{ total: '50' }] })   // errors
      .mockResolvedValueOnce({ rows: [{ total: '10' }] })   // active subs
      .mockResolvedValueOnce({ rows: [{ total: '5000' }] }); // revenue
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await statsHandler(req, res);
    expect(res.body.success).toBe(true);
  });

  test('handles DB error gracefully', async () => {
    query.mockRejectedValue(new Error('DB Error'));
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await statsHandler(req, res);
    expect([200, 500]).toContain(res.statusCode);
  });
});

describe('GET /api/admin/submissions', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns pending submissions', async () => {
    query.mockResolvedValueOnce({ rows: [
      { id: 1, name: 'Test Spoke', plugin_id: 'com.test', status: 'pending', created_at: new Date() },
    ]});
    const req = createMockReq({ method: 'GET', query: { status: 'pending' } });
    const res = createMockRes();
    await submissionsHandler(req, res);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.submissions)).toBe(true);
  });

  test('approves submission and adds to directory', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })  // update status
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', plugin_id: 'com.test', description: 'desc', category: 'ITSM' }] }) // get submission
      .mockResolvedValueOnce({ rows: [] })  // insert spoke
      .mockResolvedValueOnce({ rows: [] }); // audit log
    const req = createMockReq({ method: 'POST', body: { id: 1, action: 'approve', reviewer_notes: 'Looks good' } });
    const res = createMockRes();
    await submissionsHandler(req, res);
    expect(res.body.success).toBe(true);
  });

  test('rejects submission', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const req = createMockReq({ method: 'POST', body: { id: 1, action: 'reject', reviewer_notes: 'Duplicate' } });
    const res = createMockRes();
    await submissionsHandler(req, res);
    expect(res.body.success).toBe(true);
  });

  test('returns 400 for invalid action', async () => {
    const req = createMockReq({ method: 'POST', body: { id: 1, action: 'invalid' } });
    const res = createMockRes();
    await submissionsHandler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
