// services/person-service/src/modules/persons/validators/person.validator.js

const { body } = require('express-validator');
const BaseValidator = require('@plantilla/shared/validators/base.validator');

const NATIONAL_ID = { min: 4, max: 20 };
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

class PersonValidator {
  static updateMe() {
    return [
      ...BaseValidator.personName('firstName', 'El nombre', { optional: true }),
      ...BaseValidator.personName('lastName', 'El apellido', { optional: true }),
      body('nationalId')
        .optional({ nullable: true })
        .trim()
        .isLength(NATIONAL_ID)
        .withMessage({
          message: `El documento debe tener entre ${NATIONAL_ID.min} y ${NATIONAL_ID.max} caracteres`,
          hint: 'Ingresá el documento sin espacios'
        }),
      body('phone')
        .optional({ nullable: true })
        .trim()
        .matches(PHONE_REGEX)
        .withMessage({ message: 'Teléfono inválido', hint: 'Usá formato internacional, por ejemplo +56912345678' }),
      body('birthDate')
        .optional({ nullable: true })
        .isISO8601({ strict: true })
        .withMessage({ message: 'Fecha de nacimiento inválida', hint: 'Usá el formato AAAA-MM-DD' })
    ];
  }

  static listQuery() {
    return [...BaseValidator.pagination(), ...BaseValidator.searchQuery()];
  }

  static getById() {
    return [...BaseValidator.uuidParam('personId', 'La persona')];
  }
}

module.exports = PersonValidator;
