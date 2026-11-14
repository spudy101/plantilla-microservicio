// services/notification-service/src/modules/notifications/validators/notification.validator.js

const { body } = require('express-validator');
const BaseValidator = require('@plantilla/shared/validators/base.validator');
const { CHANNELS } = require('#schemas/models/notification.model');

const TITLE_MAX = 150;
const BODY_MAX = 2000;
const CHANNEL_LIST = Object.values(CHANNELS);

class NotificationValidator {
  static listQuery() {
    return [...BaseValidator.pagination(), ...BaseValidator.optionalBoolean('unreadOnly', 'unreadOnly', 'query')];
  }

  static markRead() {
    return [...BaseValidator.uuidParam('notificationId', 'La notificación')];
  }

  static adminSend() {
    return [
      ...BaseValidator.uuidBody('userId', 'El usuario'),
      body('title')
        .trim()
        .notEmpty()
        .isLength({ max: TITLE_MAX })
        .withMessage({ message: `El título es requerido (máx. ${TITLE_MAX})`, hint: 'Usá un título corto' }),
      body('body')
        .trim()
        .notEmpty()
        .isLength({ max: BODY_MAX })
        .withMessage({ message: `El mensaje es requerido (máx. ${BODY_MAX})`, hint: 'Escribí el contenido de la notificación' }),
      body('channels')
        .optional()
        .isArray({ min: 1 })
        .withMessage({ message: 'channels debe ser un arreglo', hint: `Valores: ${CHANNEL_LIST.join(', ')}` }),
      body('channels.*')
        .isIn(CHANNEL_LIST)
        .withMessage({ message: 'Canal inválido', hint: `Valores: ${CHANNEL_LIST.join(', ')}` })
    ];
  }
}

module.exports = NotificationValidator;
