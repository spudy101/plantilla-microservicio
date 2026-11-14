// services/person-service/src/app.js

require('./config');
const BaseApp = require('@plantilla/shared/base/base.app');
const db = require('#schemas');
const personRoutes = require('#modules/persons/routes/person.routes');
const adminPersonRoutes = require('#modules/persons/routes/admin-person.routes');
const openApiSpec = require('./docs/openapi');
const { version } = require('../package.json');

class PersonApp extends BaseApp {
  constructor() {
    super('person-service', { database: db, version });
  }

  setupRoutes() {
    this.app.use('/api/v1/persons', personRoutes);
    this.app.use('/api/v1/admin/persons', adminPersonRoutes);
  }

  // eslint-disable-next-line class-methods-use-this
  getOpenApiSpec() {
    return openApiSpec;
  }
}

module.exports = PersonApp;
