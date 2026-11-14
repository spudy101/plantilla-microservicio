// packages/shared/src/utils/encryption.util.js
//
// Cifrado de PII at-rest con AES-256-GCM (AEAD) e IV aleatorio por operación.
// Formato: `ivHex:authTagHex:ciphertextHex` (autocontenido, solo requiere la llave).
//
// Como el IV es aleatorio, el mismo valor cifra distinto cada vez: para buscar por
// igualdad se guarda además un hash HMAC determinístico (ver hash.util.js).
//
// Generar AES_KEY: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

const crypto = require('node:crypto');
const { crypto: cryptoConfig } = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // recomendado para GCM
const KEY_BYTES = 32;
const PARTS = 3;

let cachedKey = null;

const getKey = () => {
  if (!cachedKey) {
    if (!cryptoConfig.aesKey) {
      throw new Error('AES_KEY no configurada: este servicio no puede cifrar/descifrar PII');
    }
    cachedKey = Buffer.from(cryptoConfig.aesKey, 'hex');
    if (cachedKey.length !== KEY_BYTES) {
      throw new Error('AES_KEY debe tener 32 bytes (64 caracteres hex)');
    }
  }
  return cachedKey;
};

class EncryptionUtil {
  /**
   * @param {string|null|undefined} data - Texto plano
   * @returns {string|null|undefined} `iv:authTag:ciphertext` en hex
   */
  static encrypt(data) {
    if (data === null || data === undefined) {
      return data;
    }
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(String(data), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
  }

  /**
   * @param {string|null|undefined} encrypted
   * @returns {string|null|undefined} Texto plano
   * @throws si el formato es inválido o el authTag no valida (dato alterado)
   */
  static decrypt(encrypted) {
    if (!encrypted) {
      return encrypted;
    }
    const parts = encrypted.split(':');
    if (parts.length !== PARTS) {
      throw new Error('Formato de dato cifrado inválido');
    }
    const [ivHex, tagHex, dataHex] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  }

  /** Igual que decrypt pero retorna null en vez de lanzar (para DTOs). */
  static safeDecrypt(encrypted) {
    try {
      return EncryptionUtil.decrypt(encrypted);
    } catch {
      return null;
    }
  }
}

module.exports = EncryptionUtil;
