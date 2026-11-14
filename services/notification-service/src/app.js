// services/notification-service/src/app.js

require('./config');
const BaseApp = require('@plantilla/shared/base/base.app');
const db = require('#schemas');
const notificationRoutes = require('#modules/notifications/routes/notification.routes');
const adminNotificationRoutes = require('#modules/notifications/routes/admin-notification.routes');
const openApiSpec = require('./docs/openapi');
const { version } = require('../package.json');

class NotificationApp extends BaseApp {
  constructor() {
    super('notification-service', { database: db, version });
  }

  setupRoutes() {
    this.app.use('/api/v1/notifications', notificationRoutes);
    this.app.use('/api/v1/admin/notifications', adminNotificationRoutes);
  }

  // eslint-disable-next-line class-methods-use-this
  getOpenApiSpec() {
    return openApiSpec;
  }
}

module.exports = NotificationApp;
