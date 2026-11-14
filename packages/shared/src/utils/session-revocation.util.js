// packages/shared/src/utils/session-revocation.util.js
//
// Lista de sesiones revocadas compartida entre servicios.
//
// Problema: un access token JWT es válido hasta su `exp` aunque el usuario haga
// logout. Solución: al revocar, iam-service escribe `auth:revoked-session:<sid>`
// en Redis con TTL = vida máxima del access token; gateway y servicios lo
// consultan en AuthMiddleware. Pasado el TTL el token ya expiró solo.
//
// Sin Redis cae a un Map en memoria (solo protege al propio proceso): suficiente
// en desarrollo, NO en producción con varias réplicas.

const redisClient = require('./redis.util');
const { logger } = require('./logger.util');
const { jwt: jwtConfig } = require('../config/env');

const KEY_PREFIX = 'auth:revoked-session:';
const MS = 1000;
const memoryStore = new Map(); // sid → expiresAt (ms)

class SessionRevocationUtil {
  /**
   * @param {string} sessionId
   * @param {number} [ttlSeconds] - por defecto la vida del access token
   */
  static async revoke(sessionId, ttlSeconds = jwtConfig.accessTokenTtl) {
    if (!sessionId) {
      return;
    }
    const client = redisClient.getClient();
    if (client) {
      try {
        await client.set(`${KEY_PREFIX}${sessionId}`, '1', 'EX', ttlSeconds);
        return;
      } catch (error) {
        logger.warn('No se pudo registrar la revocación en Redis — usando memoria', { error: error.message });
      }
    }
    memoryStore.set(sessionId, Date.now() + ttlSeconds * MS);
  }

  /**
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  static async isRevoked(sessionId) {
    if (!sessionId) {
      return false;
    }
    const client = redisClient.getClient();
    if (client) {
      try {
        return (await client.exists(`${KEY_PREFIX}${sessionId}`)) === 1;
      } catch (error) {
        logger.warn('No se pudo consultar revocación en Redis — usando memoria', { error: error.message });
      }
    }
    const expiresAt = memoryStore.get(sessionId);
    if (!expiresAt) {
      return false;
    }
    if (expiresAt < Date.now()) {
      memoryStore.delete(sessionId);
      return false;
    }
    return true;
  }
}

module.exports = SessionRevocationUtil;
