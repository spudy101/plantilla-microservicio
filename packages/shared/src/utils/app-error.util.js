// packages/shared/src/utils/app-error.util.js

/**
 * Error centralizado de la aplicación. Extiende Error para conservar el stack.
 *
 * isOperational = true  → error grave/inesperado → logger.error (5xx)
 * isOperational = false → error de negocio esperado → logger.info/warn (4xx)
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    this.retryAfter = null;

    Error.captureStackTrace(this, this.constructor);
  }

  /** 400 — Parámetros incorrectos o faltantes */
  static badRequest(message, details = null) {
    return new AppError(message, 400, 'BAD_REQUEST', details, false);
  }

  /** 401 — No autenticado */
  static unauthorized(message = 'No autorizado', details = null, code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code, details, false);
  }

  /** 403 — Autenticado pero sin permiso */
  static forbidden(message = 'Acceso denegado', details = null) {
    return new AppError(message, 403, 'FORBIDDEN', details, false);
  }

  /** 404 — Recurso no encontrado */
  static notFound(message = 'Recurso no encontrado', details = null) {
    return new AppError(message, 404, 'NOT_FOUND', details, false);
  }

  /** 409 — Conflicto de estado */
  static conflict(message, details = null) {
    return new AppError(message, 409, 'CONFLICT', details, false);
  }

  /** 422 — Error de validación (details = [{ field, message, hint, value }]) */
  static unprocessableEntity(message, details = null) {
    return new AppError(message, 422, 'UNPROCESSABLE_ENTITY', details, false);
  }

  /** 429 — Rate limit excedido */
  static tooManyRequests(message = 'Demasiadas peticiones', details = null, retryAfter = null) {
    const err = new AppError(message, 429, 'RATE_LIMIT', details, false);
    err.retryAfter = retryAfter;
    return err;
  }

  /** 500 — Error interno (bug real) */
  static internal(message = 'Error interno del servidor', details = null) {
    return new AppError(message, 500, 'INTERNAL_ERROR', details, true);
  }

  /** 502 — Un servicio downstream respondió con error */
  static badGateway(message = 'Error en un servicio interno', details = null) {
    return new AppError(message, 502, 'UPSTREAM_ERROR', details, true);
  }

  /** 503 — Servicio no disponible temporalmente */
  static serviceUnavailable(message = 'Servicio no disponible temporalmente', details = null) {
    return new AppError(message, 503, 'SERVICE_UNAVAILABLE', details, false);
  }
}

module.exports = AppError;
