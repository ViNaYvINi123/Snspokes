// Production-grade logger using Winston
// Falls back to console in client-side context

let logger = null;

function createLogger() {
  if (typeof window !== 'undefined') {
    // Client side - return console wrapper
    return {
      info: (...args) => console.log('[INFO]', ...args),
      warn: (...args) => console.warn('[WARN]', ...args),
      error: (...args) => console.error('[ERROR]', ...args),
      debug: (...args) => process.env.NODE_ENV !== 'production' && console.debug('[DEBUG]', ...args),
    };
  }

  // Server side - use Winston
  try {
    const winston = require('winston');
    const { combine, timestamp, printf, colorize, errors } = winston.format;

    const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level.toUpperCase()}] ${stack || message}${metaStr}`;
    });

    return winston.createLogger({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
      transports: [
        new winston.transports.Console({
          format: process.env.NODE_ENV !== 'production'
            ? combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat)
            : logFormat,
        }),
        // File logging in production
        ...(process.env.NODE_ENV === 'production' ? [
          new winston.transports.File({ filename: '/tmp/snspokes-error.log', level: 'error', maxsize: 5242880, maxFiles: 3 }),
          new winston.transports.File({ filename: '/tmp/snspokes-combined.log', maxsize: 5242880, maxFiles: 5 }),
        ] : []),
      ],
    });
  } catch {
    // Winston not available - use console
    return {
      info: (...args) => console.log('[INFO]', ...args),
      warn: (...args) => console.warn('[WARN]', ...args),
      error: (...args) => console.error('[ERROR]', ...args),
      debug: (...args) => console.debug('[DEBUG]', ...args),
    };
  }
}

export function getLogger() {
  if (!logger) logger = createLogger();
  return logger;
}

export default getLogger();
