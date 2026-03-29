const { apiError, validateRequired, sanitizeInput } = require('../../lib/validate');

describe('apiError', () => {
  test('sends correct status and message', () => {
    const res = createMockRes();
    apiError(res, 'Test error', 400);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Test error' }));
  });

  test('defaults to 500 status', () => {
    const res = createMockRes();
    apiError(res, 'Server error');
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('includes success:false in response', () => {
    const res = createMockRes();
    apiError(res, 'Bad request', 400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe('validateRequired', () => {
  test('returns null when all fields present', () => {
    const result = validateRequired({ name: 'test', email: 'a@b.com' }, ['name', 'email']);
    expect(result).toBeNull();
  });

  test('returns missing field name', () => {
    const result = validateRequired({ name: 'test' }, ['name', 'email']);
    expect(result).toContain('email');
  });

  test('treats empty string as missing', () => {
    const result = validateRequired({ name: '' }, ['name']);
    expect(result).toBeTruthy();
  });

  test('treats null as missing', () => {
    const result = validateRequired({ name: null }, ['name']);
    expect(result).toBeTruthy();
  });
});

describe('sanitizeInput', () => {
  test('removes HTML tags', () => {
    const result = sanitizeInput('<script>alert("xss")</script>Hello');
    expect(result).not.toContain('<script>');
    expect(result).toContain('Hello');
  });

  test('trims whitespace', () => {
    const result = sanitizeInput('  hello  ');
    expect(result).toBe('hello');
  });

  test('handles null/undefined gracefully', () => {
    expect(() => sanitizeInput(null)).not.toThrow();
    expect(() => sanitizeInput(undefined)).not.toThrow();
  });
});
