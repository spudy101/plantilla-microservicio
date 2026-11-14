// packages/shared/src/utils/redis.util.js
//
// Cliente Redis OPCIONAL. Si Redis no está (o REDIS_ENABLED=false) el servicio
// sigue funcionando: los consumidores deben chequear isAvailable() y caer a su
// fallback (memoria / BD). Igual que en plantilla-base.

const Redis = require('ioredis');
const { redis: redisConfig } = require('../config/env');
const { logger } = require('./logger.util');

const CONNECT_TIMEOUT_MS = 5000;
const MAX_RETRY_DELAY_MS = 5000;
const RETRY_STEP_MS = 200;

class RedisClient {
  #client = null;
  #available = false;

  async connect() {
    if (!redisConfig.enabled) {
      logger.info('Redis deshabilitado (REDIS_ENABLED=false)');
      return;
    }
    if (this.#client) {
      return;
    }

    this.#client = this.createConnection();
    this.#client.on('ready', () => {
      this.#available = true;
      logger.info('Redis listo');
    });
    this.#client.on('end', () => {
      this.#available = false;
    });
    this.#client.on('error', error => {
      if (this.#available) {
        logger.warn('Redis no disponible — usando fallback', { error: error.message });
      }
      this.#available = false;
    });

    try {
      await this.#client.connect();
      this.#available = true;
    } catch (error) {
      logger.warn('No se pudo conectar a Redis — arrancando sin Redis', { error: error.message });
      this.#available = false;
    }
  }

  /**
   * Crea una conexión NUEVA (los consumidores bloqueantes como XREADGROUP necesitan la suya).
   * @returns {import('ioredis').Redis}
   */
  // eslint-disable-next-line class-methods-use-this
  createConnection() {
    return new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      ...(redisConfig.tls && { tls: {} }),
      lazyConnect: true,
      connectTimeout: CONNECT_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      retryStrategy: times => Math.min(times * RETRY_STEP_MS, MAX_RETRY_DELAY_MS)
    });
  }

  isAvailable() {
    return this.#available;
  }

  /** @returns {import('ioredis').Redis|null} */
  getClient() {
    return this.#available ? this.#client : null;
  }

  async disconnect() {
    if (this.#client) {
      await this.#client.quit().catch(() => this.#client.disconnect());
      this.#client = null;
      this.#available = false;
    }
  }
}

module.exports = new RedisClient();
