const handler = require('../../pages/api/chatbot').default;
const { n8nChatbot } = require('../../lib/n8n');
const { checkRateLimit } = require('../../lib/redis');

describe('POST /api/chatbot', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns answer for valid question', async () => {
    n8nChatbot.mockResolvedValueOnce({ success: true, data: { answer: 'GlideRecord is used to query tables', model: 'test' } });
    const req = createMockReq({ method: 'POST', body: { question: 'What is GlideRecord?' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body.success).toBe(true);
    expect(res.body.answer).toBeTruthy();
  });

  test('returns 400 for empty question', async () => {
    const req = createMockReq({ method: 'POST', body: { question: '' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for missing question', async () => {
    const req = createMockReq({ method: 'POST', body: {} });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 429 when rate limited', async () => {
    checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetIn: 60 });
    const req = createMockReq({ method: 'POST', body: { question: 'test?' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(429);
  });

  test('falls back to direct AI when n8n fails', async () => {
    n8nChatbot.mockResolvedValueOnce({ success: false, error: 'n8n unavailable' });
    const req = createMockReq({ method: 'POST', body: { question: 'test question?' } });
    const res = createMockRes();
    await handler(req, res);
    // Should still return something (fallback)
    expect(res.body).toBeTruthy();
  });

  test('returns 405 for GET request', async () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  test('includes via field in response', async () => {
    n8nChatbot.mockResolvedValueOnce({ success: true, data: { answer: 'test answer', model: 'test' } });
    const req = createMockReq({ method: 'POST', body: { question: 'What is ServiceNow?' } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body).toHaveProperty('via');
  });

  test('accepts conversation history', async () => {
    n8nChatbot.mockResolvedValueOnce({ success: true, data: { answer: 'Follow-up answer', model: 'test' } });
    const history = [
      { role: 'user', content: 'What is GlideRecord?' },
      { role: 'assistant', content: 'GlideRecord is...' },
    ];
    const req = createMockReq({ method: 'POST', body: { question: 'How do I use it?', history } });
    const res = createMockRes();
    await handler(req, res);
    expect(res.body.success).toBe(true);
    expect(n8nChatbot).toHaveBeenCalledWith('How do I use it?', expect.any(Array));
  });
});
