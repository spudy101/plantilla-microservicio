// packages/shared/src/base/base.app.js

const express = require('express');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

const SecurityMiddleware = require('../middlewares/security.middleware');
const CorrelationMiddleware = require('../middlewares/correlation.middleware');
const ErrorMiddleware = require('../middlewares/error.middleware');
const auditContextMiddleware = require('../middlewares/audit-context.middleware');
const { httpLogger } = require('../utils/logger.util');
const redisClient = require('../utils/redis.util');
const { HTTP_STATUS } = require('../constants/http');

const BODY_LIMIT = '1mb';

/**
 * Base de toda app Express de un microservicio.
 *
 * Las subclases implementan:
 *   - setupRoutes()      → montar routers de negocio
 * y opcionalmente:
 *   - getOpenApiSpec()   → objeto OpenAPI (se publica en /docs)
 *
 * Opciones:
 *   - database   → { sequelize } para el health check (null si el servicio no tiene BD)
 *   - parseBody  → false en el gateway (el body se reenvía tal cual al servicio)
 *   - version    → versión del servicio (package.json)
 */
class BaseApp {
  /**
   * @param {string} serviceName
   * @param {{ database?: { sequelize: any }|null, parseBody?: boolean, version?: string }} [options]
   */
  constructor(serviceName, { database = null, parseBody = true, version = '1.0.0' } = {}) {
    this.serviceName = serviceName;
    this.database = database;
    this.version = version;
    this.app = express();

    this.#setupCore(parseBody);
    this.#setupDocs();
    this.setupRoutes();
    this.#setupErrorHandlers();
  }

  // ─── Framework wiring ───────────────────────────────────────────────────────

  #setupCore(parseBody) {
    this.app.set('trust proxy', 1);
    this.app.disable('x-powered-by');

    // ⚠️ ORDEN CRÍTICO — no reordenar
    this.app.use(CorrelationMiddleware.addCorrelationId); // 1. Correlation ID (primero)
    this.app.use(SecurityMiddleware.helmet()); // 2. Headers de seguridad
    this.app.use(SecurityMiddleware.cors());
    this.app.use(SecurityMiddleware.addSecurityHeaders);
    if (parseBody) {
      this.app.use(express.json({ limit: BODY_LIMIT })); // 3. Body parsers
      this.app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
    }
    this.app.use(auditContextMiddleware); // 4. Contexto (AsyncLocalStorage)
    this.app.use(compression()); // 5. Compresión
    this.app.use(httpLogger); // 6. Log HTTP

    this.app.get('/health', (req, res) => this.#health(req, res));
    this.app.get('/health/live', (req, res) => res.status(HTTP_STATUS.OK).json({ status: 'alive' }));
  }

  #setupDocs() {
    const spec = this.getOpenApiSpec();
    if (spec) {
      this.app.get('/docs.json', (req, res) => res.json(spec));
      this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
    }
  }

  #setupErrorHandlers() {
    this.app.use(ErrorMiddleware.handleNotFound);
    this.app.use(ErrorMiddleware.handleError);
  }

  /**
   * Readiness: 200 si las dependencias críticas responden, 503 si la BD no.
   * Redis es opcional → "degraded", nunca 503.
   */
  async #health(req, res) {
    const checks = {};

    if (this.database?.sequelize) {
      const start = Date.now();
      try {
        await this.database.sequelize.authenticate();
        checks.database = { status: 'healthy', responseTimeMs: Date.now() - start };
      } catch {
        checks.database = { status: 'unhealthy', responseTimeMs: Date.now() - start };
      }
    }

    checks.redis = redisClient.isAvailable()
      ? { status: 'healthy' }
      : { status: 'degraded', note: 'sin Redis (fallback en memoria)' };

    Object.assign(checks, await this.extraHealthChecks());

    const statuses = Object.values(checks).map(c => c.status);
    let status = 'healthy';
    if (statuses.includes('unhealthy')) {
      status = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      status = 'degraded';
    }

    return res.status(status === 'unhealthy' ? HTTP_STATUS.SERVICE_UNAVAILABLE : HTTP_STATUS.OK).json({
      status,
      service: this.serviceName,
      version: this.version,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      checks
    });
  }

  // ─── Hooks ──────────────────────────────────────────────────────────────────

  /** Montar rutas de negocio. */
  setupRoutes() {
    throw new Error(`${this.constructor.name} debe implementar setupRoutes()`);
  }

  /** @returns {Object|null} especificación OpenAPI */
  // eslint-disable-next-line class-methods-use-this
  getOpenApiSpec() {
    return null;
  }

  /** Checks adicionales del health (p.ej. el gateway consulta a los servicios). */
  // eslint-disable-next-line class-methods-use-this, require-await
  async extraHealthChecks() {
    return {};
  }

  getApp() {
    return this.app;
  }
}

module.exports = BaseApp;
