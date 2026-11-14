// packages/shared/src/middlewares/auth.middleware.js
//
// Zero-trust entre servicios: el gateway valida el JWT para cortar temprano,
// pero CADA servicio lo vuelve a verificar con la clave pública. Así un servicio
// expuesto por error (o llamado desde dentro de la VPC) nunca confía en headers
// que cualquiera podría falsificar.
//
// Llamadas servicio → servicio usan internalOnly (X-Internal-Api-Key).

const AppError = require('../utils/app-error.util');
const JwtUtil = require('../utils/jwt.util');
const HashUtil = require('../utils/hash.util');
const RequestContext = require('../utils/request-context.util');
const SessionRevocationUtil = require('../utils/session-revocation.util');
const { internal } = require('../config/env');
const { ERROR_CODES, ERROR_MESSAGES, HEADERS } = require('../constants/http');

const BEARER_PREFIX = 'Bearer ';

const extractBearer = req => {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return header.slice(BEARER_PREFIX.length).trim() || null;
};

class AuthMiddleware {
  /**
   * Exige un access token válido y no revocado.
   * Deja en req.user: { userId, sessionId, role }.
   */
  static async authenticate(req, res, next) {
    try {
      const token = extractBearer(req);
      if (!token) {
        throw AppError.unauthorized(ERROR_MESSAGES.TOKEN_MISSING);
      }

      const claims = await JwtUtil.verifyAccessToken(token);

      if (await SessionRevocationUtil.isRevoked(claims.sessionId)) {
        throw AppError.unauthorized(ERROR_MESSAGES.SESSION_REVOKED, null, ERROR_CODES.SESSION_REVOKED);
      }

      req.user = { userId: claims.userId, sessionId: claims.sessionId, role: claims.role };
      RequestContext.assign({ userId: claims.userId, sessionId: claims.sessionId });
      return next();
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Solo llamadas internas (otro servicio con la API key compartida).
   * Estos endpoints viven bajo /internal y el gateway NUNCA los enruta.
   */
  static internalOnly(req, res, next) {
    const provided = req.headers[HEADERS.INTERNAL_API_KEY];
    if (!HashUtil.safeEqual(provided, internal.apiKey)) {
      return next(AppError.forbidden(ERROR_MESSAGES.INTERNAL_ONLY));
    }
    req.sourceService = req.headers[HEADERS.SOURCE_SERVICE] ?? 'unknown';
    return next();
  }
}

module.exports = AuthMiddleware;
module.exports.extractBearer = extractBearer;
