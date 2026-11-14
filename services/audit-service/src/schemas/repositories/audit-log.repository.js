// services/audit-service/src/schemas/repositories/audit-log.repository.js
//
// NO extiende BaseRepository a propósito: un rastro de auditoría no debe tener
// update/delete. Solo append + consultas.

const { Op } = require('sequelize');
const { models } = require('#schemas');

const MAX_TEXT = 500;
const truncate = value => (value == null ? null : String(value).slice(0, MAX_TEXT));

class AuditLogRepository {
  constructor() {
    this.model = models.AuditLog;
  }

  /**
   * Inserta un registro (idempotente por event_id).
   * @param {Object} record - formato de logAudit (camelCase)
   * @param {string|null} eventId
   * @returns {Promise<boolean>} true si se insertó
   */
  async append(record, eventId = null) {
    if (eventId && (await this.model.count({ where: { event_id: eventId } }))) {
      return false;
    }
    await this.model.create({
      event_id: eventId,
      action: record.action,
      actor_id: record.actorId ?? null,
      session_id: record.sessionId ?? null,
      service: record.service ?? 'unknown',
      outcome: record.outcome ?? 'success',
      entity_type: record.entityType ?? null,
      entity_id: record.entityId == null ? null : String(record.entityId),
      http_status: record.httpStatus ?? null,
      error_code: record.errorCode ?? null,
      error_message: truncate(record.errorMessage),
      details: record.details ?? null,
      correlation_id: record.correlationId ?? null,
      ip: record.ip ?? null,
      user_agent: truncate(record.userAgent),
      method: record.method ?? null,
      path: truncate(record.path),
      source: record.source ?? null,
      occurred_at: record.occurredAt ? new Date(record.occurredAt) : new Date()
    });
    return true;
  }

  findById(auditId) {
    return this.model.findByPk(auditId);
  }

  /**
   * @param {{ actorId?, action?, service?, outcome?, entityType?, entityId?, correlationId?, dateFrom?, dateTo? }} filters
   * @param {{ limit, offset, order }} paginationParams
   */
  findAllPaginated(filters, { limit, offset, order }) {
    const where = {};
    const map = {
      actorId: 'actor_id',
      action: 'action',
      service: 'service',
      outcome: 'outcome',
      entityType: 'entity_type',
      entityId: 'entity_id',
      correlationId: 'correlation_id'
    };
    for (const [key, column] of Object.entries(map)) {
      if (filters[key]) {
        where[column] = filters[key];
      }
    }
    if (filters.dateFrom || filters.dateTo) {
      where.occurred_at = {
        ...(filters.dateFrom && { [Op.gte]: new Date(filters.dateFrom) }),
        ...(filters.dateTo && { [Op.lte]: new Date(filters.dateTo) })
      };
    }
    return this.model.findAndCountAll({ where, limit, offset, order: [['occurred_at', order]] });
  }
}

module.exports = new AuditLogRepository();
