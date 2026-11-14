// packages/shared/src/middlewares/rate-limit.middleware.js
//
// Rate limiting en memoria por proceso. El límite "global" de verdad lo pone el
// api-gateway (primera línea); estos limiters protegen además endpoints sensibles
// (login, refresh) dentro de cada servicio.
//
// Con varias réplicas, reemplazar el store por uno en Redis (rate-limit-redis).

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const AppError = require('../utils/app-error.util');
const { server } = require('../config/env');
const { ERROR_MESSAGES } = require('../constants/http');

const MINUTE_MS = 60 * 1000;
const API_WINDOW_MS = 15 * MINUTE_MS;
const API_MAX = 300;
const AUTH_WINDOW_MS = 15 * MINUTE_MS;
const AUTH_MAX = 10;

const buildLimiter = ({ windowMs, max, keyGenerator }) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => server.isTest,
    ...(keyGenerator && { keyGenerator }),
    handler: (req, res, next, options) =>
      next(AppError.tooManyRequests(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, null, Math.ceil(options.windowMs / 1000)))
  });

class RateLimitMiddleware {
  /** Límite general por IP (o por usuario si está autenticado). */
  static apiLimiter({ windowMs = API_WINDOW_MS, max = API_MAX } = {}) {
    return buildLimiter({ windowMs, max, keyGenerator: req => req.user?.userId ?? ipKeyGenerator(req.ip) });
  }

  /** Límite estricto para login / registro / refresh. */
  static authLimiter({ windowMs = AUTH_WINDOW_MS, max = AUTH_MAX } = {}) {
    return buildLimiter({ windowMs, max });
  }
}

module.exports = RateLimitMiddleware;
