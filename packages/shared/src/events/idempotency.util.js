// packages/shared/src/events/idempotency.util.js
//
// Los brokers garantizan entrega "al menos una vez": el mismo evento puede llegar
// dos veces (reintento, redelivery de SQS, reclaim de Redis Streams). Antes de
// procesar, el consumidor "reclama" el eventId; si ya estaba reclamado, lo salta.
//
// Redis (SET NX con TTL) si está disponible; si no, memoria (por proceso).
// Para efectos críticos (cobros, etc.) usar además una restricción UNIQUE en BD.

const redisClient = require('../utils/redis.util');

const KEY_PREFIX = 'events:processed:';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días
const MEMORY_MAX_ENTRIES = 10000;

const memory = new Set();

class IdempotencyUtil {
  /**
   * @param {string} consumer - nombre del servicio consumidor
   * @param {string} eventId
   * @returns {Promise<boolean>} true si es la primera vez (procesar), false si es duplicado
   */
  static async claim(consumer, eventId) {
    const key = `${KEY_PREFIX}${consumer}:${eventId}`;
    const client = redisClient.getClient();
    if (client) {
      const result = await client.set(key, '1', 'EX', TTL_SECONDS, 'NX');
      return result === 'OK';
    }
    if (memory.has(key)) {
      return false;
    }
    if (memory.size >= MEMORY_MAX_ENTRIES) {
      memory.delete(memory.values().next().value);
    }
    memory.add(key);
    return true;
  }

  /** Libera el reclamo para que un reintento pueda volver a procesarlo. */
  static async release(consumer, eventId) {
    const key = `${KEY_PREFIX}${consumer}:${eventId}`;
    const client = redisClient.getClient();
    if (client) {
      await client.del(key);
      return;
    }
    memory.delete(key);
  }
}

module.exports = IdempotencyUtil;
