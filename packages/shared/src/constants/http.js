// packages/shared/src/constants/http.js

const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
});

const ERROR_CODES = Object.freeze({
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED'
});

const ERROR_MESSAGES = Object.freeze({
  INTERNAL_ERROR: 'Error interno del servidor',
  TOKEN_MISSING: 'Token de acceso requerido',
  TOKEN_INVALID: 'Token inválido',
  TOKEN_EXPIRED: 'El token ha expirado',
  SESSION_REVOKED: 'La sesión fue cerrada. Inicia sesión nuevamente',
  RATE_LIMIT_EXCEEDED: 'Demasiadas peticiones, intenta nuevamente más tarde',
  FORBIDDEN: 'No tienes permisos para realizar esta acción',
  INTERNAL_ONLY: 'Endpoint de uso interno'
});

// Nombres amigables para errores de unicidad de Sequelize (no filtrar nombres de columnas).
const FIELD_LABELS = Object.freeze({
  email_hash: 'correo electrónico',
  national_id_hash: 'documento de identidad',
  user_id: 'usuario'
});
const DEFAULT_FIELD_LABEL = 'valor';

const HEADERS = Object.freeze({
  CORRELATION_ID: 'x-correlation-id',
  REQUEST_ID: 'x-request-id',
  INTERNAL_API_KEY: 'x-internal-api-key',
  SOURCE_SERVICE: 'x-source-service'
});

module.exports = { HTTP_STATUS, ERROR_CODES, ERROR_MESSAGES, FIELD_LABELS, DEFAULT_FIELD_LABEL, HEADERS };
