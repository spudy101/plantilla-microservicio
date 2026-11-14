// services/audit-service/src/events/index.js

const { EVENT_TYPES } = require('@plantilla/shared/constants/events');
const AuditLogService = require('#modules/audit-logs/services/audit-log.service');

const registerAuditEventHandlers = bus => {
  bus.subscribe(EVENT_TYPES.AUDIT_RECORDED, (payload, event) => AuditLogService.record(payload, event.eventId));
};

module.exports = { registerAuditEventHandlers };
