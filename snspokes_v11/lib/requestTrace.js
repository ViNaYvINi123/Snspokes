// Request ID tracing - every request gets a UUID for log correlation
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

// Simple UUID v4 without dependency
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function withTrace(handler) {
  return async (req, res) => {
    const requestId = req.headers['x-request-id'] || generateId();
    const start = Date.now();

    // Attach to request
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Log incoming
    logger.debug(`[${requestId}] → ${req.method} ${req.url}`);

    // Intercept response finish
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - start;
      logger.debug(`[${requestId}] ← ${res.statusCode} ${duration}ms`);

      // Log slow requests
      if (duration > 2000) {
        logger.warn(`[${requestId}] SLOW REQUEST ${req.method} ${req.url} took ${duration}ms`);
      }

      // Log errors
      if (res.statusCode >= 500) {
        logger.error(`[${requestId}] ERROR ${res.statusCode} ${req.method} ${req.url}`);
      }

      return originalEnd.apply(this, args);
    };

    try {
      await handler(req, res);
    } catch (err) {
      logger.error(`[${requestId}] UNHANDLED: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Internal server error', request_id: requestId });
      }
    }
  };
}
