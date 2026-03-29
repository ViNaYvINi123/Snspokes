// Global test setup — mocks all external dependencies
// so tests run without a real DB, Redis, or n8n

// ── Environment variables ──────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_URL = 'http://localhost:3001';
process.env.NEXTAUTH_SECRET = 'test-secret-32-chars-minimum-ok!';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'snspokes_test';
process.env.DB_USER = 'snspokes_user';
process.env.DB_PASSWORD = 'Vinay@123';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.N8N_URL = 'http://localhost:5678';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'snspokes@admin2025';
process.env.ADMIN_SECRET = 'test-admin-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32chars-ok!!';
process.env.RAZORPAY_KEY_ID = 'rzp_test_xxx';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'testpass';
process.env.SMTP_FROM_EMAIL = 'noreply@snspokes.com';
process.env.SMTP_FROM_NAME = 'snspokes';

// ── Mock DB ────────────────────────────────────────────────
jest.mock('../lib/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  pool: { end: jest.fn() },
}));

// ── Mock Redis ─────────────────────────────────────────────
jest.mock('../lib/redis', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(true),
  cacheDel: jest.fn().mockResolvedValue(true),
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetIn: 3600 }),
}));

// ── Mock n8n ───────────────────────────────────────────────
jest.mock('../lib/n8n', () => ({
  callN8n: jest.fn().mockResolvedValue({ success: true, data: { answer: 'mocked response' } }),
  n8nChatbot: jest.fn().mockResolvedValue({ success: true, data: { answer: 'mocked chatbot response', model: 'test-model' } }),
  n8nGenerateCode: jest.fn().mockResolvedValue({ success: true, data: { code: '// mocked code', model: 'test-model' } }),
  n8nLintScript: jest.fn().mockResolvedValue({ success: true, data: { issues: [], score: 100, grade: 'A' } }),
  n8nAnalyzeError: jest.fn().mockResolvedValue({ success: true, data: { title: 'Test Error', description: 'Test', fix_steps: [], category: 'Script', severity: 'low' } }),
  n8nOptimizeQuery: jest.fn().mockResolvedValue({ success: true, data: { optimized: 'test query', explanation: 'mocked' } }),
  n8nAiDebug: jest.fn().mockResolvedValue({ success: true, data: { answer: 'mocked debug answer' } }),
  n8nEnrichSpoke: jest.fn().mockResolvedValue({ success: true, data: { description: 'mocked description' } }),
}));

// ── Mock Email ─────────────────────────────────────────────
jest.mock('../lib/email', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendPlanUpgradeEmail: jest.fn().mockResolvedValue(true),
  sendBackupAlertEmail: jest.fn().mockResolvedValue(true),
}));

// ── Mock Logger ────────────────────────────────────────────
jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ── Mock requestTrace ──────────────────────────────────────
jest.mock('../lib/requestTrace', () => ({
  withTrace: (handler) => handler,
}));

// ── Mock adminAuth ─────────────────────────────────────────
jest.mock('../lib/adminAuth', () => ({
  withAdminAuth: (handler) => handler,
  withAdminPage: (component) => component,
  verifyAdminToken: jest.fn().mockReturnValue({ valid: true, username: 'admin' }),
}));

// ── Mock next-auth ─────────────────────────────────────────
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: { user: { id: 1, email: 'test@test.com', name: 'Test User', plan: 'free' } }, status: 'authenticated' })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}));

jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn().mockResolvedValue({ user: { id: 1, email: 'test@test.com', name: 'Test', plan: 'free' } }),
}));

// ── Global helpers ─────────────────────────────────────────
global.createMockReq = (options = {}) => ({
  method: 'GET',
  headers: {},
  query: {},
  body: {},
  socket: { remoteAddress: '127.0.0.1' },
  ...options,
});

global.createMockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockImplementation(function(data) { this.body = data; return this; }),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
  };
  res.status.mockImplementation((code) => { res.statusCode = code; return res; });
  return res;
};

// Silence console in tests unless TEST_VERBOSE=1
if (!process.env.TEST_VERBOSE) {
  global.console = { ...console, log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}
