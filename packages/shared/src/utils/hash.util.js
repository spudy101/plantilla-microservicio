// packages/shared/src/utils/hash.util.js
//
// Hash determinístico (HMAC-SHA256 + pepper) para buscar por igualdad sobre campos
// cifrados: `email` (AES-GCM, para mostrar) + `email_hash` (HMAC, para WHERE).
//
// Generar HASH_PEPPER: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

const crypto = require('node:crypto');
const { crypto: cryptoConfig } = require('../config/env');

class HashUtil {
  /**
   * @param {string|null|undefined} value
   * @returns {string|null} 64 chars hex o null si el valor es vacío
   */
  static hashForSearch(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (!cryptoConfig.hashPepper) {
      throw new Error('HASH_PEPPER no configurado');
    }
    return crypto.createHmac('sha256', cryptoConfig.hashPepper).update(String(value).trim().toLowerCase()).digest('hex');
  }

  /** Comparación en tiempo constante contra un hash almacenado. */
  static verify(plainValue, storedHash) {
    if (!plainValue || !storedHash) {
      return false;
    }
    try {
      return crypto.timingSafeEqual(Buffer.from(HashUtil.hashForSearch(plainValue), 'hex'), Buffer.from(storedHash, 'hex'));
    } catch {
      return false;
    }
  }

  /** SHA-256 simple (p.ej. para guardar el jti de un refresh token sin exponerlo). */
  static sha256(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
  }

  /** Comparación de strings en tiempo constante (API keys, tokens). */
  static safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }
    const bufA = Buffer.from(HashUtil.sha256(a), 'hex');
    const bufB = Buffer.from(HashUtil.sha256(b), 'hex');
    return crypto.timingSafeEqual(bufA, bufB);
  }
}

module.exports = HashUtil;
