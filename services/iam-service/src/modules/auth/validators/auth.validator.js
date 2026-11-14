// services/iam-service/src/modules/auth/validators/auth.validator.js

const BaseValidator = require('@plantilla/shared/validators/base.validator');

class AuthValidator {
  static register() {
    return [
      ...BaseValidator.email('email'),
      ...BaseValidator.password('password'),
      ...BaseValidator.personName('firstName', 'El nombre'),
      ...BaseValidator.personName('lastName', 'El apellido')
    ];
  }

  static login() {
    return [...BaseValidator.email('email'), ...BaseValidator.requiredString('password', 'La contraseña')];
  }

  static refresh() {
    return [...BaseValidator.requiredString('refreshToken', 'El refresh token')];
  }
}

module.exports = AuthValidator;
