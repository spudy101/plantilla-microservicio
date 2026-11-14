// services/audit-service/src/server.js

const config = require('./config');
const BaseServer = require('@plantilla/shared/base/base.server');
const db = require('#schemas');
const { registerAuditEventHandlers } = require('#events/index');
const AuditLogService = require('#modules/audit-logs/services/audit-log.service');
const AuditApp = require('./app');

new BaseServer({
  serviceName: 'audit-service',
  port: config.server.port,
  database: db,
  createApp: () => new AuditApp().getApp(),
  registerEventHandlers: registerAuditEventHandlers,
  // Este servicio persiste SUS propios registros directo en BD (no los publica
  // al bus para volver a consumirlos).
  auditSink: record => AuditLogService.record(record, null)
}).start();
