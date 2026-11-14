// packages/shared/src/validators/base.validator.js
//
// Cadenas express-validator reutilizables. Todo withMessage usa { message, hint }
// para que el front muestre el campo y cómo corregirlo (ver ValidatorUtil).

const { body, param, query } = require('express-validator');

const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
const PASSWORD_MIN_LENGTH = 10;
const NAME_MIN = 2;
const NAME_MAX = 50;
const EMAIL_MAX = 255;
const SEARCH_MAX = 100;
const SORT_MAX = 50;
const MAX_LIMIT = 100;

const UUID_HINT = 'El identificador debe ser un UUID válido';
const PASSWORD_HINT = 'Incluí mayúsculas, minúsculas, números y un carácter especial';

class BaseValidator {
  // ─── Identidad ──────────────────────────────────────────────────────────────

  static email(field = 'email') {
    const hint = 'Ingresá un correo válido, por ejemplo usuario@dominio.com';
    return [
      body(field)
        .trim()
        .notEmpty()
        .withMessage({ message: 'El email es requerido', hint })
        .isEmail()
        .withMessage({ message: 'Debe ser un email válido', hint })
        .isLength({ max: EMAIL_MAX })
        .withMessage({ message: `El email no puede superar los ${EMAIL_MAX} caracteres`, hint })
        .normalizeEmail({ gmail_remove_dots: false })
    ];
  }

  static password(field = 'password') {
    return [
      body(field)
        .notEmpty()
        .withMessage({ message: 'La contraseña es requerida', hint: PASSWORD_HINT })
        .isLength({ min: PASSWORD_MIN_LENGTH })
        .withMessage({ message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`, hint: PASSWORD_HINT })
        .matches(PASSWORD_REGEX)
        .withMessage({
          message: 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
          hint: PASSWORD_HINT
        })
    ];
  }

  /** Para login: solo exige presencia (no revela la política). */
  static requiredString(field, label) {
    return [
      body(field)
        .isString()
        .notEmpty()
        .withMessage({ message: `${label} es requerido`, hint: `Ingresá ${label.toLowerCase()}` })
    ];
  }

  static personName(field, label, { optional = false } = {}) {
    const hint = `Usá entre ${NAME_MIN} y ${NAME_MAX} caracteres, solo letras y espacios`;
    let chain = body(field);
    chain = optional ? chain.optional({ nullable: true }) : chain;
    return [
      chain
        .trim()
        .notEmpty()
        .withMessage({ message: `${label} es requerido`, hint })
        .isLength({ min: NAME_MIN, max: NAME_MAX })
        .withMessage({ message: `${label} debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres`, hint })
        .matches(NAME_REGEX)
        .withMessage({ message: `${label} solo puede contener letras`, hint })
    ];
  }

  // ─── Identificadores ────────────────────────────────────────────────────────

  static uuidParam(field, label) {
    return [
      param(field)
        .notEmpty()
        .withMessage({ message: `${label} es requerido`, hint: UUID_HINT })
        .isUUID()
        .withMessage({ message: `${label} debe ser un UUID válido`, hint: UUID_HINT })
    ];
  }

  static uuidBody(field, label) {
    return [
      body(field)
        .notEmpty()
        .withMessage({ message: `${label} es requerido`, hint: UUID_HINT })
        .isUUID()
        .withMessage({ message: `${label} debe ser un UUID válido`, hint: UUID_HINT })
    ];
  }

  static optionalUuidQuery(field, label) {
    return [
      query(field)
        .optional({ nullable: true })
        .isUUID()
        .withMessage({ message: `${label} debe ser un UUID válido`, hint: UUID_HINT })
    ];
  }

  static optionalBoolean(field, label = 'El valor', location = 'body') {
    const chain = location === 'query' ? query(field) : body(field);
    return [
      chain
        .optional()
        .isBoolean()
        .withMessage({ message: `${label} debe ser verdadero o falso`, hint: 'Usá true o false' })
        .toBoolean()
    ];
  }

  // ─── Listados ───────────────────────────────────────────────────────────────

  static pagination() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage({ message: 'La página debe ser un número entero mayor a 0', hint: 'Ingresá un número de página mayor a 0' })
        .toInt(),
      query('limit')
        .optional()
        .isInt({ min: 1, max: MAX_LIMIT })
        .withMessage({
          message: `El límite debe ser un número entre 1 y ${MAX_LIMIT}`,
          hint: `Ingresá un límite entre 1 y ${MAX_LIMIT}`
        })
        .toInt(),
      query('sortBy')
        .optional()
        .trim()
        .isLength({ max: SORT_MAX })
        .withMessage({ message: 'El campo de ordenamiento es inválido', hint: 'Indicá un campo de ordenamiento válido' }),
      query('order')
        .optional()
        .trim()
        .isIn(['ASC', 'DESC', 'asc', 'desc'])
        .withMessage({ message: 'El orden debe ser ASC o DESC', hint: 'Indicá ASC o DESC' })
    ];
  }

  static searchQuery() {
    return [
      query('search')
        .optional()
        .trim()
        .isLength({ max: SEARCH_MAX })
        .withMessage({
          message: `El término de búsqueda no puede superar ${SEARCH_MAX} caracteres`,
          hint: `Usá hasta ${SEARCH_MAX} caracteres en la búsqueda`
        })
    ];
  }
}

module.exports = BaseValidator;
