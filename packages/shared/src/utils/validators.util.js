// packages/shared/src/utils/validators.util.js

const { validationResult } = require('express-validator');
const AppError = require('./app-error.util');

class ValidatorUtil {
  /**
   * Cierra la cadena de express-validator: si hay errores lanza AppError 422 con
   * [{ field, message, hint, value }] para que el handler global responda (y agregue
   * correlationId). Usar SIEMPRE después de las reglas del validator en la route.
   */
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formatted = errors.array().map(err => {
      const msg = typeof err.msg === 'object' ? err.msg : { message: err.msg };
      return {
        field: err.path || err.param,
        message: msg.message,
        hint: msg.hint || null,
        value: err.value
      };
    });

    return next(AppError.unprocessableEntity('Error de validación', formatted));
  }

  static isValidUUID(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
  }
}

module.exports = ValidatorUtil;
