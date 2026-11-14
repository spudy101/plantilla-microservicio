// services/person-service/src/server.js

const config = require('./config');
const BaseServer = require('@plantilla/shared/base/base.server');
const db = require('#schemas');
const { registerPersonEventHandlers } = require('#events/index');
const PersonApp = require('./app');

new BaseServer({
  serviceName: 'person-service',
  port: config.server.port,
  database: db,
  createApp: () => new PersonApp().getApp(),
  registerEventHandlers: registerPersonEventHandlers
}).start();
