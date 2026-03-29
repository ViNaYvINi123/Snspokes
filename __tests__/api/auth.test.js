const registerHandler = require('../../pages/api/auth/register').default;
const forgotHandler = require('../../pages/api/auth/forgot-password').default;
const { query } = require('../../lib/db');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../../lib/email');

describe('POST /api/auth/register', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('registers new user successfully', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })  // no existing user
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'new@test.com', name: 'New User' }] }); // insert
    const req = createMockReq({ method: 'POST', body: { name: 'New User', email: 'new@test.com', password: 'password123' } });
    const res = createMockRes();
    await registerHandler(req, res);
    expect(res.body.success).toBe(true);
    expect(sendWelcomeEmail).toHaveBeenCalledWith('new@test.com', 'New User');
  });

  test('returns 400 for duplicate email', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // existing user found
    const req = createMockReq({ method: 'POST', body: { name: 'Test', email: 'existing@test.com', password: 'password123' } });
    const res = createMockRes();
    await registerHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('already registered');
  });

  test('returns 400 for missing name', async () => {
    const req = createMockReq({ method: 'POST', body: { email: 'test@test.com', password: 'password123' } });
    const res = createMockRes();
    await registerHandler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for short password', async () => {
    const req = createMockReq({ method: 'POST', body: { name: 'Test', email: 'test@test.com', password: 'short' } });
    const res = createMockRes();
    await registerHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('8 characters');
  });

  test('returns 400 for missing email', async () => {
    const req = createMockReq({ method: 'POST', body: { name: 'Test', password: 'password123' } });
    const res = createMockRes();
    await registerHandler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('normalizes email to lowercase', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: 1, email: 'upper@test.com', name: 'Test' }] });
    const req = createMockReq({ method: 'POST', body: { name: 'Test', email: 'UPPER@TEST.COM', password: 'password123' } });
    const res = createMockRes();
    await registerHandler(req, res);
    expect(query).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['upper@test.com']));
  });
});

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns success even for non-existent email (prevent enumeration)', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // no user found
    const req = createMockReq({ method: 'POST', body: { action: 'request', email: 'notfound@test.com' } });
    const res = createMockRes();
    await forgotHandler(req, res);
    expect(res.body.success).toBe(true);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test('sends reset email for valid user', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@test.com', name: 'User' }] }) // user found
      .mockResolvedValueOnce({ rows: [] })  // invalidate old tokens
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // insert new token
    const req = createMockReq({ method: 'POST', body: { action: 'request', email: 'user@test.com' } });
    const res = createMockRes();
    await forgotHandler(req, res);
    expect(res.body.success).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith('user@test.com', expect.stringContaining('forgot-password?token='));
  });

  test('returns 400 for invalid/expired reset token', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // no valid token
    const req = createMockReq({ method: 'POST', body: { action: 'reset', token: 'invalid-token', password: 'newpass123' } });
    const res = createMockRes();
    await forgotHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('invalid or expired');
  });

  test('resets password with valid token', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] }) // valid token
      .mockResolvedValueOnce({ rows: [] }) // update password
      .mockResolvedValueOnce({ rows: [] }); // mark token used
    const req = createMockReq({ method: 'POST', body: { action: 'reset', token: 'valid-token-here', password: 'newpassword123' } });
    const res = createMockRes();
    await forgotHandler(req, res);
    expect(res.body.success).toBe(true);
  });

  test('returns 400 for password too short on reset', async () => {
    const req = createMockReq({ method: 'POST', body: { action: 'reset', token: 'some-token', password: 'short' } });
    const res = createMockRes();
    await forgotHandler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for unknown action', async () => {
    const req = createMockReq({ method: 'POST', body: { action: 'unknown' } });
    const res = createMockRes();
    await forgotHandler(req, res);
    expect(res.statusCode).toBe(400);
  });
});
