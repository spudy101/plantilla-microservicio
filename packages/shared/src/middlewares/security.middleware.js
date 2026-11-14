// packages/shared/src/middlewares/security.middleware.js

const helmet = require('helmet');
const cors = require('cors');
const { server } = require('../config/env');

const CORS_MAX_AGE_SECONDS = 600;

class SecurityMiddleware {
  static helmet() {
    return helmet({
      contentSecurityPolicy: server.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'same-site' }
    });
  }

  static cors() {
    const allowAll = server.corsOrigins.includes('*');
    return cors({
      origin: allowAll ? true : server.corsOrigins,
      credentials: !allowAll,
      exposedHeaders: ['X-Correlation-Id', 'Retry-After'],
      maxAge: CORS_MAX_AGE_SECONDS
    });
  }

  /** Headers extra que helmet no setea por defecto. */
  static addSecurityHeaders(req, res, next) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    res.removeHeader('X-Powered-By');
    next();
  }
}

module.exports = SecurityMiddleware;
