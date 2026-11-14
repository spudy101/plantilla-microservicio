// packages/shared/src/middlewares/audit-context.middleware.js
//
// Abre el contexto (AsyncLocalStorage) del request: todo logger/logAudit/evento
// publicado dentro del request hereda correlationId, ip, userAgent, etc.
// AuthMiddleware lo completa con userId/sessionId cuando autentica.

const RequestContext = require('../utils/request-context.util');

const auditContextMiddleware = (req, res, next) => {
  const context = {
    correlationId: req.correlationId,
    userId: null,
    sessionId: null,
    ip: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    method: req.method,
    path: req.originalUrl,
    source: 'http'
  };
  res.locals.auditContext = context;
  RequestContext.run(context, next);
};

module.exports = auditContextMiddleware;
