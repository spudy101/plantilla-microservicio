// services/audit-service/src/modules/audit-logs/validators/audit-log.validator.js

const { query } = require('express-validator');
const BaseValidator = require('@plantilla/shared/validators/base.validator');

const SHORT_TEXT_MAX = 128;

const optionalText = field =>
  query(field)
    .optional()
    .trim()
    .isLength({ max: SHORT_TEXT_MAX })
    .withMessage({ message: `${field} inválido`, hint: `Máximo ${SHORT_TEXT_MAX} caracteres` });

const optionalDate = field =>
  query(field)
    .optional()
    .isISO8601()
    .withMessage({ message: `${field} debe ser una fecha ISO 8601`, hint: 'Ejemplo: 2026-01-31T00:00:00Z' });

class AuditLogValidator {
  static listQuery() {
    return [
      ...BaseValidator.pagination(),
      optionalText('actorId'),
      optionalText('action'),
      optionalText('service'),
      query('outcome')
        .optional()
        .isIn(['success', 'failure'])
        .withMessage({ message: 'outcome inválido', hint: 'Usá success o failure' }),
      optionalText('entityType'),
      optionalText('entityId'),
      optionalText('correlationId'),
      optionalDate('dateFrom'),
      optionalDate('dateTo')
    ];
  }

  static getById() {
    return [...BaseValidator.uuidParam('auditId', 'El registro de auditoría')];
  }
}

module.exports = AuditLogValidator;
