// services/api-gateway/src/middlewares/gateway.middleware.js

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const AppError = require('@plantilla/shared/utils/app-error.util');
const AuthMiddleware = require('@plantilla/shared/middlewares/auth.middleware');
const { ERROR_MESSAGES } = require('@plantilla/shared/constants/http');
const config = require('#config/index');
const { resolveRoute } = require('#routing/route-table');

const MS_PER_MINUTE = 60000;
const windowMs = config.rateLimit.windowMinutes * MS_PER_MINUTE;

const limiter = (max, keyGenerator) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.server.isTest,
    ...(keyGenerator && { keyGenerator }),
    handler: (req, res, next) =>
      next(AppError.tooManyRequests(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, null, Math.ceil(windowMs / 1000)))
  });

// Público (login/registro): por IP y más estricto. Autenticado: por usuario.
const publicLimiter = limiter(config.rateLimit.authMax);
const userLimiter = limiter(config.rateLimit.max, req => req.user?.userId ?? ipKeyGenerator(req.ip));

class GatewayMiddleware {
  /** Las rutas /internal jamás se exponen hacia afuera. */
  static blockInternal(req, res, next) {
    if (req.path === '/internal' || req.path.startsWith('/internal/')) {
      return next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.path}`));
    }
    return next();
  }

  /** Resuelve el servicio destino; si no hay ruta sigue al 404 del BaseApp. */
  static resolve(req, res, next) {
    req.gatewayRoute = resolveRoute(req.method, req.path);
    return next(req.gatewayRoute ? undefined : 'router');
  }

  /**
   * Corta temprano los requests sin token válido (ahorra un salto de red).
   * El servicio destino vuelve a verificar: el gateway NO es la única barrera.
   */
  static authenticate(req, res, next) {
    if (req.gatewayRoute.isPublic) {
      return publicLimiter(req, res, next);
    }
    return AuthMiddleware.authenticate(req, res, err => (err ? next(err) : userLimiter(req, res, next)));
  }
}

module.exports = GatewayMiddleware;
