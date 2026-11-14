// services/audit-service/src/modules/audit-logs/services/audit-log.service.js

const AppError = require('@plantilla/shared/utils/app-error.util');
const PaginationHelper = require('@plantilla/shared/utils/pagination.util');
const { logger, logAudit } = require('@plantilla/shared/utils/logger.util');
const auditLogRepository = require('#schemas/repositories/audit-log.repository');
const { AuditLogComponent, AuditLogListDTO } = require('../dtos/audit-log.dto');

const FILTERS = ['actorId', 'action', 'service', 'outcome', 'entityType', 'entityId', 'correlationId', 'dateFrom', 'dateTo'];
const ENTITY = { entityType: 'AuditLog' };

class AuditLogService {
  /** Persiste un registro venido del bus (idempotente por eventId). */
  record(record, eventId) {
    if (!record?.action) {
      logger.warn('Registro de auditoría sin action descartado', { eventId });
      return Promise.resolve(false);
    }
    return auditLogRepository.append(record, eventId);
  }

  async list(query, adminUserId) {
    const paginationParams = PaginationHelper.getPaginationParams(query);
    const filters = PaginationHelper.buildFilters(query, FILTERS);
    const { rows, count } = await auditLogRepository.findAllPaginated(filters, paginationParams);

    // Consultar la auditoría también se audita (quién miró qué).
    logAudit('AUDIT_LOGS_QUERIED', adminUserId, { filters, totalItems: count }, ENTITY);
    const metadata = PaginationHelper.buildListMetadata(count, { ...paginationParams, sortBy: 'occurred_at' }, filters);
    return AuditLogListDTO(rows, metadata);
  }

  async getById(auditId, adminUserId) {
    const log = await auditLogRepository.findById(auditId);
    if (!log) {
      throw AppError.notFound('Registro de auditoría no encontrado');
    }
    logAudit('AUDIT_LOG_VIEWED', adminUserId, {}, { ...ENTITY, entityId: auditId });
    return AuditLogComponent(log);
  }
}

module.exports = new AuditLogService();
