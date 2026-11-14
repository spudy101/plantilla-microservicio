// services/audit-service/src/modules/audit-logs/dtos/audit-log.dto.js

const { ListResponseDTO } = require('@plantilla/shared/dtos/metadata.dto');

const AuditLogComponent = log => ({
  auditId: log.audit_id,
  action: log.action,
  actorId: log.actor_id,
  sessionId: log.session_id,
  service: log.service,
  outcome: log.outcome,
  entityType: log.entity_type,
  entityId: log.entity_id,
  httpStatus: log.http_status,
  errorCode: log.error_code,
  errorMessage: log.error_message,
  details: log.details ?? null, // ya viene sanitizado desde logAudit
  correlationId: log.correlation_id,
  ip: log.ip,
  userAgent: log.user_agent,
  method: log.method,
  path: log.path,
  source: log.source,
  occurredAt: log.occurred_at
});

const AuditLogListDTO = (rows, metadata) => ListResponseDTO(rows, metadata, AuditLogComponent);

module.exports = { AuditLogComponent, AuditLogListDTO };
