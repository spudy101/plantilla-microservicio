// services/audit-service/src/app.js

require('./config');
const BaseApp = require('@plantilla/shared/base/base.app');
const db = require('#schemas');
const auditLogRoutes = require('#modules/audit-logs/routes/audit-log.routes');
const openApiSpec = require('./docs/openapi');
const { version } = require('../package.json');

class AuditApp extends BaseApp {
  constructor() {
    super('audit-service', { database: db, version });
  }

  setupRoutes() {
    this.app.use('/api/v1/admin/audit-logs', auditLogRoutes);
  }

  // eslint-disable-next-line class-methods-use-this
  getOpenApiSpec() {
    return openApiSpec;
  }
}

module.exports = AuditApp;
