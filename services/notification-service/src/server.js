// services/notification-service/src/server.js

const config = require('./config');
const BaseServer = require('@plantilla/shared/base/base.server');
const db = require('#schemas');
const { registerNotificationEventHandlers } = require('#events/index');
const NotificationApp = require('./app');

new BaseServer({
  serviceName: 'notification-service',
  port: config.server.port,
  database: db,
  createApp: () => new NotificationApp().getApp(),
  registerEventHandlers: registerNotificationEventHandlers
}).start();
