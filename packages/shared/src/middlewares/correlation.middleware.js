// packages/shared/src/middlewares/correlation.middleware.js

const crypto = require('node:crypto');
const { HEADERS } = require('../constants/http');

const SUFFIX_LENGTH = 8;
const MAX_INCOMING_LENGTH = 128;
const SAFE_ID = /^[\w.:-]+$/;

/**
 * Correlation ID por request. Si llega X-Correlation-Id (del gateway o de otro
 * servicio) se respeta, así el mismo ID recorre gateway → servicio → eventos.
 * Se devuelve en el header de respuesta para que el front lo reporte.
 */
class CorrelationMiddleware {
  static addCorrelationId(req, res, next) {
    const incoming = req.headers[HEADERS.CORRELATION_ID] || req.headers[HEADERS.REQUEST_ID];
    const isSafe = typeof incoming === 'string' && incoming.length <= MAX_INCOMING_LENGTH && SAFE_ID.test(incoming);
    const correlationId = isSafe ? incoming : CorrelationMiddleware.generateId();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    next();
  }

  /** @returns {string} req-{timestamp}-{uuid-corto} */
  static generateId() {
    return `req-${Date.now()}-${crypto.randomUUID().slice(0, SUFFIX_LENGTH)}`;
  }
}

module.exports = CorrelationMiddleware;
