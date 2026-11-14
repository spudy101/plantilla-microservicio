// services/iam-service/src/modules/admin-users/validators/admin-user.validator.js

const { body, query } = require('express-validator');
const BaseValidator = require('@plantilla/shared/validators/base.validator');
const { USER_STATUS } = require('#schemas/models/user.model');

const STATUSES = Object.values(USER_STATUS);

class AdminUserValidator {
  static listQuery() {
    return [
      ...BaseValidator.pagination(),
      ...BaseValidator.optionalUuidQuery('roleId', 'El rol'),
      query('status')
        .optional()
        .isIn(STATUSES)
        .withMessage({ message: 'Estado inválido', hint: `Valores permitidos: ${STATUSES.join(', ')}` })
    ];
  }

  static getById() {
    return [...BaseValidator.uuidParam('userId', 'El usuario')];
  }

  static updateStatus() {
    return [
      ...BaseValidator.uuidParam('userId', 'El usuario'),
      body('status')
        .isIn(STATUSES)
        .withMessage({ message: 'Estado inválido', hint: `Valores permitidos: ${STATUSES.join(', ')}` }),
      body('reason')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage({ message: 'El motivo no puede superar 255 caracteres', hint: 'Resumí el motivo' })
    ];
  }
}

module.exports = AdminUserValidator;
