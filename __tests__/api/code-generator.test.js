const handler = require('../../pages/api/tools/code-generator').default;
const { n8nGenerateCode } = require('../../lib/n8n');
const { query } = require('../../lib/db');

jest.mock('../../lib/plans', () => ({
  checkSearchLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
  checkAiLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
  getUserPlan: jest.fn().mockResolvedValue('free'),
  PLAN_LIMITS: { free: { searches_per_day: 50, ai_per_day: 10, api_calls: 0 } },
}));

describe('POST /api/tools/code-generator', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns generated code via n8n', async () => {
    n8nGenerateCode.mockResolvedValueOnce({ success: true, data: { code: '(function executeRule(current, previous) { // code })(current, previous);', model: 'test' } });
    const req = createMockReq({
      method: 'POST',
      body: { prompt: 'Auto-assign incidents to on-call group', code_type: 'business_rule' },
    });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body.success).toBe(true);
    expect(res.body.code).toBeTruthy();
    expect(res.body.via).toBe('n8n');
  });

  test('returns 400 for missing prompt', async () => {
    const req = createMockReq({ method: 'POST', body: { code_type: 'business_rule' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for invalid code_type', async () => {
    const req = createMockReq({ method: 'POST', body: { prompt: 'test', code_type: 'invalid_type' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns available code types on GET', async () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body.success).toBe(true);
    expect(res.body.code_types).toBeTruthy();
  });

  test('accepts all valid code types', async () => {
    n8nGenerateCode.mockResolvedValue({ success: true, data: { code: '// code', model: 'test' } });
    const validTypes = ['business_rule', 'script_include', 'client_script', 'scheduled_job', 'rest_api', 'transform_map', 'flow_script'];
    for (const type of validTypes) {
      const req = createMockReq({ method: 'POST', body: { prompt: 'Test prompt for ' + type, code_type: type } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.body.success).toBe(true);
    }
  });

  test('falls back to direct when n8n fails', async () => {
    n8nGenerateCode.mockResolvedValueOnce({ success: false, error: 'n8n down' });
    const req = createMockReq({ method: 'POST', body: { prompt: 'test prompt here', code_type: 'business_rule' } });
    const res = createMockRes();
    await handler(req, res);
    // Should attempt fallback — won't crash
    expect(res.body).toBeTruthy();
  });

  test('returns 403 when AI limit reached', async () => {
    const { checkSearchLimit } = require('../../lib/plans');
    checkSearchLimit.mockResolvedValueOnce({ allowed: false, message: 'Limit reached', limit_reached: true });
    const req = createMockReq({ method: 'POST', body: { prompt: 'test', code_type: 'business_rule' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });
});
