// Production API Gateway — handles auth, rate limiting, usage tracking, compression
import { verifyApiKey } from './apiKeys';
import { checkRateLimit, cacheGet, cacheSet } from './redis';
import { query } from './db';
import { setSecurityHeaders } from './security';
import logger from './logger';

const PLAN_RATE_LIMITS = {
  anonymous: { rpm: 10,  rpd: 50,    burst: 5   },
  free:      { rpm: 20,  rpd: 200,   burst: 10  },
  pro:       { rpm: 60,  rpd: 5000,  burst: 30  },
  enterprise:{ rpm: 300, rpd: 100000, burst: 100 },
};

// Main gateway wrapper
export function withAPIGateway(handler, options = {}) {
  const { requireAuth = false, cacheTTL = 0, maxBodySize = 50000 } = options;

  return async function gatewayHandler(req, res) {
    const startTime = Date.now();
    const requestId = 'req_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    // Security headers
    setSecurityHeaders(res);
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Powered-By', 'snspokes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Identify caller
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'anon';
    let plan = 'anonymous';
    let userId = null;
    let keyId = null;

    // API key auth
    const auth = await verifyApiKey(req).catch(() => null);
    if (auth) {
      plan = auth.plan || 'free';
      userId = auth.user_id;
      keyId = auth.key_id;
    } else if (requireAuth) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'API key required. Get one at snspokes.com/dashboard' },
        docs: 'https://snspokes.com/docs/api#authentication',
      });
    }

    // Rate limiting — per-minute + per-day
    const limits = PLAN_RATE_LIMITS[plan] || PLAN_RATE_LIMITS.anonymous;
    const rateLimitKey = userId ? `api:${userId}` : `api:ip:${ip}`;

    const [minuteCheck, dailyCheck] = await Promise.all([
      checkRateLimit(rateLimitKey + ':m', limits.rpm, 60),
      checkRateLimit(rateLimitKey + ':d', limits.rpd, 86400),
    ]);

    res.setHeader('X-RateLimit-Limit', limits.rpm);
    res.setHeader('X-RateLimit-Remaining', Math.min(minuteCheck.remaining, dailyCheck.remaining));
    res.setHeader('X-RateLimit-Plan', plan);

    if (!minuteCheck.allowed || !dailyCheck.allowed) {
      const resetIn = Math.max(minuteCheck.resetIn || 0, dailyCheck.resetIn || 0);
      res.setHeader('Retry-After', Math.ceil(resetIn));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded (${plan} plan: ${limits.rpm}/min, ${limits.rpd}/day)`,
          retry_after: Math.ceil(resetIn),
          upgrade_url: plan === 'anonymous' || plan === 'free' ? 'https://snspokes.com/pricing' : null,
        },
      });
    }

    // Body size check
    if (req.body && JSON.stringify(req.body).length > maxBodySize) {
      return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: `Request body exceeds ${maxBodySize} bytes` } });
    }

    // Response cache (GET only)
    if (req.method === 'GET' && cacheTTL > 0) {
      const cKey = `apicache:${req.url}`;
      const cached = await cacheGet(cKey);
      if (cached) {
        try {
          res.setHeader('X-Cache', 'HIT');
          return res.status(200).json(JSON.parse(cached));
        } catch {}
      }
    }

    // Execute handler
    try {
      // Inject context
      req.apiContext = { requestId, plan, userId, keyId, ip, startTime };

      // Wrap res.json to track + cache
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        const latency = Date.now() - startTime;
        res.setHeader('X-Response-Time', latency + 'ms');

        // Track usage (async, non-blocking)
        trackUsage(requestId, req, plan, userId, keyId, ip, latency, res.statusCode).catch(() => {});

        // Cache successful GET responses
        if (req.method === 'GET' && cacheTTL > 0 && res.statusCode === 200) {
          cacheSet(`apicache:${req.url}`, JSON.stringify(data), cacheTTL).catch(() => {});
          res.setHeader('X-Cache', 'MISS');
        }

        return originalJson(data);
      };

      await handler(req, res);
    } catch (err) {
      const latency = Date.now() - startTime;
      logger.error(`[API] ${requestId} ${req.method} ${req.url} ERROR ${latency}ms: ${err.message}`);
      if (!res.headersSent) {
        return res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Try again.', request_id: requestId },
        });
      }
    }
  };
}

// Track API usage for billing + analytics
async function trackUsage(requestId, req, plan, userId, keyId, ip, latency, status) {
  try {
    await query(
      `INSERT INTO sn_api_logs (request_id, method, path, plan, user_id, api_key_id, ip, latency_ms, status_code, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
      [requestId, req.method, (req.url || '').substring(0, 200), plan, userId, keyId, ip, latency, status]
    );
  } catch {}
}
