// packages/shared/src/utils/masking.util.js
//
// Enmascaramiento de PII en respuestas. Regla: en listados y vistas de terceros
// (admin/operador) la PII sale enmascarada; el dueño (/me) la ve completa.

const VISIBLE_EMAIL_CHARS = 2;
const VISIBLE_TAIL = 4;
const MASK = '*';

class MaskingUtil {
  /** juan.perez@mail.com → ju********@mail.com */
  static maskEmail(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return email ?? null;
    }
    const [local, domain] = email.split('@');
    const visible = local.slice(0, VISIBLE_EMAIL_CHARS);
    return `${visible}${MASK.repeat(Math.max(local.length - VISIBLE_EMAIL_CHARS, 1))}@${domain}`;
  }

  /** 12345678 → ****5678 (documentos, teléfonos) */
  static maskTail(value) {
    if (value === null || value === undefined) {
      return null;
    }
    const str = String(value);
    if (str.length <= VISIBLE_TAIL) {
      return MASK.repeat(str.length);
    }
    return `${MASK.repeat(str.length - VISIBLE_TAIL)}${str.slice(-VISIBLE_TAIL)}`;
  }
}

module.exports = MaskingUtil;
