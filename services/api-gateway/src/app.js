// services/api-gateway/src/app.js

require('./config');
const express = require('express');
const BaseApp = require('@plantilla/shared/base/base.app');
const config = require('#config/index');
const GatewayMiddleware = require('#middlewares/gateway.middleware');
const { createProxies } = require('#routing/proxy.factory');
const { ROUTES } = require('#routing/route-table');
const { version } = require('../package.json');

/**
 * Pipeline: correlation → seguridad → (BaseApp) → bloquear /internal →
 *           resolver ruta → JWT + rate limit → proxy al servicio.
 */
class GatewayApp extends BaseApp {
  /**
   * @param {{ proxies?: Record<string, Function> }} [options] - inyectable en tests
   */
  constructor({ proxies } = {}) {
    GatewayApp.pendingProxies = proxies ?? null;
    super('api-gateway', { parseBody: false, version });
  }

  setupRoutes() {
    const proxies = GatewayApp.pendingProxies ?? createProxies();

    // Catálogo de rutas expuestas (útil para el front y para debug).
    this.app.get('/routes', (req, res) => res.json({ routes: ROUTES.map(r => ({ prefix: r.prefix, service: r.service })) }));

    const gateway = express.Router();
    gateway.use(GatewayMiddleware.resolve, GatewayMiddleware.authenticate, (req, res, next) =>
      proxies[req.gatewayRoute.service](req, res, next)
    );

    this.app.use(GatewayMiddleware.blockInternal);
    this.app.use(gateway);
  }

  /** El health del gateway incluye el estado de cada servicio (degraded si alguno cae). */
  // eslint-disable-next-line class-methods-use-this
  async extraHealthChecks() {
    const entries = await Promise.all(
      Object.entries(config.services).map(async ([name, url]) => {
        const start = Date.now();
        try {
          const res = await fetch(`${url}/health/live`, { signal: AbortSignal.timeout(config.proxy.healthTimeoutMs) });
          return [name, { status: res.ok ? 'healthy' : 'degraded', responseTimeMs: Date.now() - start }];
        } catch {
          return [name, { status: 'degraded', note: 'no responde', responseTimeMs: Date.now() - start }];
        }
      })
    );
    return Object.fromEntries(entries);
  }
}

module.exports = GatewayApp;
