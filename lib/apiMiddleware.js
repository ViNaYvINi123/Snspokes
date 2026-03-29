// API middleware - CORS, auth, error handling, logging
import logger from './logger';

export function withCors(handler) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') return res.status(200).end();
    return handler(req, res);
  };
}

export function withLogging(handler) {
  return async (req, res) => {
    const start = Date.now();
    const { method, url } = req;
    try {
      await handler(req, res);
    } finally {
      const duration = Date.now() - start;
      if (duration > 1000) {
        logger.warn(`[API] SLOW ${method} ${url} ${duration}ms`);
      } else {
        logger.debug(`[API] ${method} ${url} ${res.statusCode} ${duration}ms`);
      }
    }
  };
}

export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      logger.error(`[API] Unhandled error: ${err.message}`, { url: req.url, stack: err.stack });
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
          ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
        });
      }
    }
  };
}

// Combine all middleware
export function withApi(handler, options = {}) {
  let wrapped = withErrorHandler(handler);
  if (options.cors !== false) wrapped = withCors(wrapped);
  if (options.logging !== false) wrapped = withLogging(wrapped);
  return wrapped;
}
