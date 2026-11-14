// services/iam-service/src/server.js

const config = require('./config');
const BaseServer = require('@plantilla/shared/base/base.server');
const db = require('#schemas');
const SessionCleanupWorker = require('#workers/session-cleanup.worker');
const IamApp = require('./app');

new BaseServer({
  serviceName: 'iam-service',
  port: config.server.port,
  database: db,
  createApp: () => new IamApp().getApp(),
  startWorkers: () => SessionCleanupWorker.start(),
  stopWorkers: () => SessionCleanupWorker.stop()
}).start();
