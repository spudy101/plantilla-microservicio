// packages/shared/src/middlewares/error.middleware.js

const ApiResponse = require('../utils/app-response.util');
const AppError = require('../utils/app-error.util');
const { logger, logAudit, sanitizeForLog } = require('../utils/logger.util');
const { server } = require('../config/env');
const { HTTP_STATUS, ERROR_CODES, ERROR_MESSAGES, FIELD_LABELS, DEFAULT_FIELD_LABEL } = require('../constants/http');

// Mapeo error → acción de auditoría genérica (cuando la route no declaró una).
const resolveAuditAction = err => {
  const status = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  if (status === HTTP_STATUS.UNAUTHORIZED) {
    return 'AUTH_FAILURE';
  }
  if (status === HTTP_STATUS.FORBIDDEN) {
    return 'ACCESS_DENIED';
  }
  if (
    status === HTTP_STATUS.BAD_REQUEST ||
    status === HTTP_STATUS.UNPROCESSABLE_ENTITY ||
    err.name === 'SequelizeValidationError'
  ) {
    return 'VALIDATION_FAILURE';
  }
  if (status === HTTP_STATUS.NOT_FOUND) {
    return 'RESOURCE_NOT_FOUND';
  }
  if (status === HTTP_STATUS.CONFLICT || status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return 'BUSINESS_RULE_VIOLATION';
  }
  return 'SYSTEM_ERROR';
};

// 400/404/422 los resuelve el usuario solo → info. El resto de 4xx → warn.
const USER_RESOLVABLE = new Set([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND, HTTP_STATUS.UNPROCESSABLE_ENTITY]);

class ErrorMiddleware {
  /** Wrapper para controllers async: elimina el try/catch en cada uno. */
  static asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  }

  /** Handler global — registrar al final del pipeline. */
  static handleError(err, req, res, _next) {
    const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const errorCode = err.code || ERROR_CODES.INTERNAL_ERROR;

    ErrorMiddleware.#logError(err, req, statusCode, errorCode);

    const declared = res.locals?.auditAction;
    logAudit(
      declared?.action ?? resolveAuditAction(err),
      req.user?.userId ?? null,
      { path: req.path, method: req.method },
      {
        outcome: 'failure',
        httpStatus: statusCode,
        errorCode,
        errorMessage: err.message,
        entityType: declared?.entityType ?? null
      }
    );

    if (err instanceof AppError) {
      return ErrorMiddleware.#handleAppError(err, req, res);
    }
    if (err.name?.startsWith('Sequelize')) {
      return ErrorMiddleware.#handleSequelizeError(err, req, res);
    }
    if (err.type === 'entity.parse.failed') {
      return ApiResponse.error(
        res,
        'El cuerpo de la solicitud contiene JSON inválido',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_JSON_BODY'
      );
    }

    return ApiResponse.error(
      res,
      server.isProduction ? ERROR_MESSAGES.INTERNAL_ERROR : err.message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
      { correlationId: req.correlationId }
    );
  }

  /** 404 de ruta — registrar antes de handleError. */
  static handleNotFound(req, res) {
    logger.warn('Ruta no encontrada', { method: req.method, path: req.path });
    return ApiResponse.notFound(res, `Ruta no encontrada: ${req.method} ${req.path}`);
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  static #handleAppError(err, req, res) {
    if (err.code === 'UNPROCESSABLE_ENTITY' && Array.isArray(err.details)) {
      return ApiResponse.validationError(res, err.details);
    }
    if (err.retryAfter) {
      res.set('Retry-After', String(err.retryAfter));
    }
    return ApiResponse.error(res, err.message, err.statusCode, err.code, { ...err.details, correlationId: req.correlationId });
  }

  static #handleSequelizeError(err, req, res) {
    switch (err.name) {
      case 'SequelizeValidationError':
        return ApiResponse.validationError(
          res,
          err.errors.map(e => ({ field: e.path, message: e.message, hint: null, value: e.value }))
        );
      case 'SequelizeUniqueConstraintError': {
        const label = FIELD_LABELS[err.errors?.[0]?.path] || DEFAULT_FIELD_LABEL;
        return ApiResponse.conflict(res, `Ya existe un registro con ese ${label}`);
      }
      case 'SequelizeForeignKeyConstraintError':
        return ApiResponse.badRequest(res, 'Referencia inválida');
      default:
        return ApiResponse.error(res, 'Error de base de datos', HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.DATABASE_ERROR, {
          correlationId: req.correlationId
        });
    }
  }

  static #logError(err, req, statusCode, errorCode) {
    if (err instanceof AppError && !err.isOperational) {
      const level = USER_RESOLVABLE.has(statusCode) ? 'info' : 'warn';
      logger[level]('Error de negocio', {
        message: err.message,
        statusCode,
        code: errorCode,
        path: req.path,
        userId: req.user?.userId
      });
      return;
    }
    logger.error(err instanceof AppError ? 'Error operacional' : 'Error inesperado', {
      message: err.message,
      stack: server.isProduction ? err.stack?.split('\n')[1]?.trim() : err.stack,
      statusCode,
      code: errorCode,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      body: req.method === 'GET' ? undefined : sanitizeForLog(req.body),
      query: sanitizeForLog(req.query)
    });
  }
}

module.exports = ErrorMiddleware;
