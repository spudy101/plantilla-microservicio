// packages/shared/src/base/base.server.js

const redisClient = require('../utils/redis.util');
const { logger, setAuditSink } = require('../utils/logger.util');
const RequestContext = require('../utils/request-context.util');
const EventBusRegistry = require('../events/event-bus');
const { EVENT_TYPES } = require('../constants/events');
const { server } = require('../config/env');

const FORCE_SHUTDOWN_MS = 10000;

/**
 * Arranque y apagado de un microservicio. Mismo ciclo para todos:
 *
 *   Redis → BD → Event bus (+ audit sink) → handlers de eventos → workers → HTTP
 *
 * y apagado ordenado inverso con SIGTERM/SIGINT (ECS manda SIGTERM).
 *
 * Uso (services/x/src/server.js):
 *   new BaseServer({
 *     serviceName: 'person-service',
 *     createApp: () => new PersonApp().getApp(),
 *     database: db,
 *     registerEventHandlers: bus => registerPersonEventHandlers(bus),
 *   }).start();
 */
class BaseServer {
  #httpServer = null;
  #options;
  #eventBus = null;

  /**
   * @param {Object} options
   * @param {string} options.serviceName
   * @param {() => import('express').Express} options.createApp
   * @param {{ sequelize: any }|null} [options.database]
   * @param {(bus: Object) => void} [options.registerEventHandlers]
   * @param {(record: Object) => Promise<void>} [options.auditSink] - por defecto publica audit.log.recorded
   * @param {() => Promise<void>} [options.startWorkers]
   * @param {() => Promise<void>} [options.stopWorkers]
   * @param {number} [options.port]
   */
  constructor(options) {
    this.#options = { database: null, port: server.port, ...options };
  }

  async start() {
    try {
      logger.info(`🚀 Iniciando ${this.#options.serviceName} (${server.nodeEnv})`);

      await redisClient.connect();
      await this.#connectDatabase();
      await RequestContext.runAsSystem('bootstrap', () => this.#startEventBus());
      if (this.#options.startWorkers) {
        await this.#options.startWorkers();
      }
      await this.#listen();

      this.#setupGracefulShutdown();
    } catch (error) {
      logger.error(`❌ No se pudo iniciar ${this.#options.serviceName}`, { error: error.message, stack: error.stack });
      process.exit(1);
    }
  }

  // ─── Infraestructura ────────────────────────────────────────────────────────

  async #connectDatabase() {
    if (!this.#options.database) {
      return;
    }
    await this.#options.database.sequelize.authenticate();
    logger.info('✅ Base de datos conectada');
  }

  async #startEventBus() {
    this.#eventBus = EventBusRegistry.init({ serviceName: this.#options.serviceName });

    setAuditSink(
      this.#options.auditSink ??
        (record => this.#eventBus.publishSafe(EVENT_TYPES.AUDIT_RECORDED, record, { actorId: record.actorId }))
    );

    if (this.#options.registerEventHandlers) {
      this.#options.registerEventHandlers(this.#eventBus);
    }
    await this.#eventBus.start();
  }

  async #listen() {
    const app = this.#options.createApp();
    await new Promise((resolve, reject) => {
      this.#httpServer = app.listen(this.#options.port, server.host, resolve);
      this.#httpServer.once('error', reject);
    });
    logger.info(`✅ ${this.#options.serviceName} escuchando en http://${server.host}:${this.#options.port}`);
  }

  // ─── Apagado ordenado ───────────────────────────────────────────────────────

  #setupGracefulShutdown() {
    const shutdown = async signal => {
      logger.info(`${signal} recibido — apagando ${this.#options.serviceName}...`);
      const forceKill = setTimeout(() => {
        logger.error('❌ Apagado forzado por timeout');
        process.exit(1);
      }, FORCE_SHUTDOWN_MS);
      forceKill.unref();

      try {
        await new Promise((resolve, reject) => {
          this.#httpServer.close(err => (err ? reject(err) : resolve()));
        });
        await this.#eventBus?.stop();
        if (this.#options.stopWorkers) {
          await this.#options.stopWorkers();
        }
        await this.#options.database?.sequelize.close();
        await redisClient.disconnect();
        logger.info('🎉 Apagado completo');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error durante el apagado', { error: error.message });
        process.exit(1);
      }
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', reason => {
      logger.error('❌ Unhandled Rejection', { message: reason?.message, stack: reason?.stack });
      if (server.isProduction) {
        process.exit(1);
      }
    });
    process.on('uncaughtException', error => {
      logger.error('❌ Uncaught Exception', { message: error?.message, stack: error?.stack });
      if (server.isProduction) {
        process.exit(1);
      }
    });
  }
}

module.exports = BaseServer;
