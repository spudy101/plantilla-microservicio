// packages/shared/src/utils/logger.util.js
//
// Logger estructurado (JSON) con winston. Cada línea lleva service + correlationId,
// así en CloudWatch/Loki se puede seguir un request a través de todos los servicios.
//
// logAudit() NO escribe en BD: arma el registro de auditoría y lo entrega al
// "audit sink". Por defecto el sink publica el evento `audit.log.recorded` en el
// event bus (lo configura BaseServer) y audit-service lo persiste. Así ningún
// servicio necesita acceso a la tabla de auditoría.

const winston = require('winston');
const { server } = require('../config/env');
const RequestContext = require('./request-context.util');

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'otp',
  'code',
  'nationalid',
  'national_id',
  'phone',
  'email'
]);
const MAX_DEPTH = 5;
const REDACTED = '[REDACTED]';
const HTTP_ERROR_THRESHOLD = 500;
const HTTP_WARN_THRESHOLD = 400;

/**
 * Copia profunda con los campos sensibles redactados. Usar SIEMPRE antes de loggear
 * body/query/params o payloads de eventos.
 */
const sanitizeForLog = (value, depth = 0) => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (depth > MAX_DEPTH) {
    return '[MAX_DEPTH]';
  }
  if (Array.isArray(value)) {
    return value.map(v => sanitizeForLog(v, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, SENSITIVE_KEYS.has(k.toLowerCase()) ? REDACTED : sanitizeForLog(v, depth + 1)])
  );
};

// Inyecta service + correlationId en cada línea.
const contextFormat = winston.format(info => {
  const ctx = RequestContext.get();
  info.service = server.serviceName;
  if (ctx?.correlationId && !info.correlationId) {
    info.correlationId = ctx.correlationId;
  }
  return info;
});

const logger = winston.createLogger({
  level: server.logLevel,
  format: winston.format.combine(
    contextFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: server.isProduction
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(
              ({ level, message, timestamp, service, correlationId, ...meta }) =>
                `${timestamp} [${service}] ${level}${correlationId ? ` (${correlationId})` : ''}: ${message}${
                  Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
                }`
            )
          )
    })
  ],
  silent: server.isTest
});

/**
 * Middleware de log HTTP: una línea por request al terminar la respuesta.
 */
const httpLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    let level = 'info';
    if (res.statusCode >= HTTP_ERROR_THRESHOLD) {
      level = 'error';
    } else if (res.statusCode >= HTTP_WARN_THRESHOLD) {
      level = 'warn';
    }
    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      correlationId: req.correlationId,
      durationMs: Math.round(durationMs),
      userId: req.user?.userId
    });
  });
  next();
};

// ─── Auditoría ──────────────────────────────────────────────────────────────

let auditSink = null;

/** Configura a dónde van los registros de auditoría (lo llama BaseServer / audit-service). */
const setAuditSink = fn => {
  auditSink = fn;
};

/**
 * Registra una acción auditable. Fire-and-forget: un fallo del sink se loggea pero
 * NUNCA rompe el request de negocio.
 *
 * @param {string} action          - Ej: 'USER_LOGGED_IN'
 * @param {string|null} actorId    - userId que ejecuta la acción ('system' en procesos internos)
 * @param {Object} [details]       - Datos de la acción (se sanitizan)
 * @param {Object} [meta]          - { entityType, entityId, outcome, httpStatus, errorCode, errorMessage }
 */
const logAudit = (action, actorId, details = {}, meta = {}) => {
  const ctx = RequestContext.getSafe();
  const record = {
    action,
    actorId: actorId ?? ctx.userId ?? null,
    sessionId: ctx.sessionId ?? null,
    service: server.serviceName,
    outcome: meta.outcome ?? 'success',
    entityType: meta.entityType ?? null,
    entityId: meta.entityId ?? null,
    httpStatus: meta.httpStatus ?? null,
    errorCode: meta.errorCode ?? null,
    errorMessage: meta.errorMessage ?? null,
    details: sanitizeForLog(details),
    correlationId: ctx.correlationId,
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
    method: ctx.method ?? null,
    path: ctx.path ?? null,
    source: ctx.source ?? 'http',
    occurredAt: new Date().toISOString()
  };

  logger.debug(`AUDIT ${action}`, { actorId: record.actorId, outcome: record.outcome });

  if (!auditSink) {
    return;
  }
  Promise.resolve()
    .then(() => auditSink(record))
    .catch(error => logger.error('No se pudo entregar el registro de auditoría', { action, error: error.message }));
};

module.exports = { logger, httpLogger, logAudit, setAuditSink, sanitizeForLog };
