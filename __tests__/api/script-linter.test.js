const handler = require('../../pages/api/tools/script-linter').default;
const { n8nLintScript } = require('../../lib/n8n');

describe('POST /api/tools/script-linter', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns lint results for valid script', async () => {
    n8nLintScript.mockResolvedValueOnce({ success: true, data: { issues: [], score: 100, grade: 'A', summary: { errors: 0, warnings: 0, info: 0 } } });
    const req = createMockReq({ method: 'POST', body: { script: 'gs.info("hello world");', script_type: 'server' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body.success).toBe(true);
    expect(res.body.grade).toBeTruthy();
    expect(res.body.score).toBeDefined();
  });

  test('returns 400 for empty script', async () => {
    const req = createMockReq({ method: 'POST', body: { script: '' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for missing script', async () => {
    const req = createMockReq({ method: 'POST', body: {} });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for script too large (>50KB)', async () => {
    const bigScript = 'a'.repeat(51000);
    const req = createMockReq({ method: 'POST', body: { script: bigScript } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('falls back to local lint when n8n fails', async () => {
    n8nLintScript.mockResolvedValueOnce({ success: false, error: 'n8n unavailable' });
    const req = createMockReq({ method: 'POST', body: { script: 'gs.info("test");', script_type: 'server' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body.success).toBe(true);
    expect(res.body.via).toBe('local');
  });

  test('returns 405 for GET request', async () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  test('includes line count in response', async () => {
    n8nLintScript.mockResolvedValueOnce({ success: true, data: { issues: [], score: 100, grade: 'A', summary: {} } });
    const script = 'gs.info("line 1");\ngs.info("line 2");\ngs.info("line 3");';
    const req = createMockReq({ method: 'POST', body: { script, script_type: 'server' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body.lines).toBe(3);
  });
});
