// services/iam-service/src/app.js

require('./config');
const BaseApp = require('@plantilla/shared/base/base.app');
const db = require('#schemas');
const authRoutes = require('#modules/auth/routes/auth.routes');
const adminUserRoutes = require('#modules/admin-users/routes/admin-user.routes');
const internalUserRoutes = require('#modules/internal/routes/internal-user.routes');
const openApiSpec = require('./docs/openapi');
const { version } = require('../package.json');

class IamApp extends BaseApp {
  constructor() {
    super('iam-service', { database: db, version });
  }

  setupRoutes() {
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/admin', adminUserRoutes);
    this.app.use('/internal/v1', internalUserRoutes);
  }

  // eslint-disable-next-line class-methods-use-this
  getOpenApiSpec() {
    return openApiSpec;
  }
}

module.exports = IamApp;
