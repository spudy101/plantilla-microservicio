// services/api-gateway/src/routing/proxy.factory.js
//
// Un proxy por servicio. El body NO se parsea en el gateway: se reenvía como
// stream (sin límite artificial ni doble serialización).

const { createProxyMiddleware } = require('http-proxy-middleware');
const ApiResponse = require('@plantilla/shared/utils/app-response.util');
const { logger } = require('@plantilla/shared/utils/logger.util');
const { HEADERS, HTTP_STATUS } = require('@plantilla/shared/constants/http');
const config = require('#config/index');

const TIMEOUT_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ESOCKETTIMEDOUT']);

const createServiceProxy = (serviceName, target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: config.proxy.timeoutMs,
    timeout: config.proxy.timeoutMs,
    on: {
      proxyReq: (proxyReq, req) => {
        // Nunca dejar pasar una API key interna enviada por un cliente externo.
        proxyReq.removeHeader(HEADERS.INTERNAL_API_KEY);
        proxyReq.removeHeader(HEADERS.SOURCE_SERVICE);
        proxyReq.setHeader(HEADERS.CORRELATION_ID, req.correlationId);
      },
      error: (err, req, res) => {
        logger.error(`Error de proxy hacia ${serviceName}`, { code: err.code, message: err.message, path: req.originalUrl });
        if (typeof res.status !== 'function' || res.headersSent) {
          res.end?.();
          return;
        }
        const isTimeout = TIMEOUT_CODES.has(err.code);
        ApiResponse.error(
          res,
          isTimeout ? `El servicio ${serviceName} no respondió a tiempo` : `El servicio ${serviceName} no está disponible`,
          isTimeout ? HTTP_STATUS.GATEWAY_TIMEOUT : HTTP_STATUS.BAD_GATEWAY,
          'UPSTREAM_ERROR',
          { correlationId: req.correlationId }
        );
      }
    }
  });

/** @returns {Record<string, Function>} servicio → middleware de proxy */
const createProxies = () =>
  Object.fromEntries(Object.entries(config.services).map(([name, url]) => [name, createServiceProxy(name, url)]));

module.exports = { createProxies };
