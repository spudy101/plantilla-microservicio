// services/api-gateway/src/server.js
//
// Sin BD y sin handlers de eventos: el gateway solo enruta.

const config = require('./config');
const BaseServer = require('@plantilla/shared/base/base.server');
const GatewayApp = require('./app');

new BaseServer({
  serviceName: 'api-gateway',
  port: config.server.port,
  createApp: () => new GatewayApp().getApp()
}).start();
