// packages/shared/src/events/event-bus.js
//
// Fachada única del bus de eventos. Los servicios NUNCA hablan con Redis/SNS
// directo: usan EventBus.get().publish(...) y .subscribe(...). El transporte se
// elige con EVENT_BUS_DRIVER (memory | redis-streams | sns-sqs).
//
//   // publicar (después de confirmar la transacción en BD)
//   await EventBus.get().publish(EVENT_TYPES.USER_REGISTERED, { userId, email });
//
//   // consumir (en src/events/index.js del servicio)
//   EventBus.get().subscribe(EVENT_TYPES.USER_REGISTERED, PersonEventHandler.onUserRegistered);
//
// Garantías: entrega al menos una vez + idempotencia por eventId en el consumidor
// + correlationId propagado. Detalle y limitaciones: docs/events.md

const { events: eventsConfig, server, redis: redisConfig } = require('../config/env');
const { logger, sanitizeForLog } = require('../utils/logger.util');
const RequestContext = require('../utils/request-context.util');
const IdempotencyUtil = require('./idempotency.util');
const { buildEnvelope, isValidEnvelope } = require('./event-envelope');
const MemoryAdapter = require('./adapters/memory.adapter');
const RedisStreamsAdapter = require('./adapters/redis-streams.adapter');
const SnsSqsAdapter = require('./adapters/sns-sqs.adapter');

const createAdapter = (driver, serviceName) => {
  switch (driver) {
    case 'memory':
      return new MemoryAdapter();
    case 'redis-streams':
      if (!redisConfig.enabled) {
        logger.warn('EVENT_BUS_DRIVER=redis-streams pero REDIS_ENABLED=false → usando bus en memoria (eventos NO durables)');
        return new MemoryAdapter();
      }
      return new RedisStreamsAdapter({ streamName: eventsConfig.streamName, serviceName });
    case 'sns-sqs':
      return new SnsSqsAdapter({
        region: eventsConfig.awsRegion,
        topicArn: eventsConfig.snsTopicArn,
        queueUrl: eventsConfig.sqsQueueUrl,
        endpoint: eventsConfig.awsEndpoint
      });
    default:
      throw new Error(`EVENT_BUS_DRIVER desconocido: ${driver}`);
  }
};

class EventBus {
  #adapter;
  #serviceName;
  #handlers = new Map(); // type → handler[]
  #started = false;

  /**
   * @param {{ driver?: string, serviceName?: string, adapter?: Object }} [options]
   */
  constructor({ driver = eventsConfig.driver, serviceName = server.serviceName, adapter = null } = {}) {
    this.#serviceName = serviceName;
    this.#adapter = adapter ?? createAdapter(driver, serviceName);
  }

  /**
   * Publica un evento. Lanza si el transporte falla: el caller decide si eso
   * aborta la operación o solo se loggea (ver publishSafe).
   * @returns {Promise<Object>} el sobre publicado
   */
  async publish(type, payload, options = {}) {
    const envelope = buildEnvelope(type, payload, options);
    await this.#adapter.publish(envelope);
    logger.debug(`Evento publicado ${type}`, { eventId: envelope.eventId });
    return envelope;
  }

  /**
   * Igual que publish pero nunca lanza: loggea el error. Para efectos secundarios
   * no críticos (p.ej. auditoría, notificaciones).
   * @returns {Promise<Object|null>}
   */
  async publishSafe(type, payload, options = {}) {
    try {
      return await this.publish(type, payload, options);
    } catch (error) {
      logger.error(`No se pudo publicar el evento ${type}`, { error: error.message, payload: sanitizeForLog(payload) });
      return null;
    }
  }

  /**
   * Registra un handler. Llamar ANTES de start().
   * @param {string} type
   * @param {(payload: Object, event: Object) => Promise<void>} handler
   */
  subscribe(type, handler) {
    const list = this.#handlers.get(type) ?? [];
    list.push(handler);
    this.#handlers.set(type, list);
    return this;
  }

  /** Empieza a consumir (solo si hay handlers registrados). */
  async start() {
    if (this.#started || this.#handlers.size === 0) {
      return;
    }
    await this.#adapter.start(envelope => this.#dispatch(envelope));
    this.#started = true;
    logger.info(`Event bus escuchando: ${[...this.#handlers.keys()].join(', ')}`);
  }

  async stop() {
    if (this.#started) {
      await this.#adapter.stop();
      this.#started = false;
    }
  }

  async #dispatch(event) {
    if (!isValidEnvelope(event)) {
      logger.warn('Evento con formato inválido descartado');
      return;
    }
    const handlers = this.#handlers.get(event.type);
    if (!handlers?.length) {
      return; // no le interesa a este servicio → se confirma igual
    }

    const isFirstTime = await IdempotencyUtil.claim(this.#serviceName, event.eventId);
    if (!isFirstTime) {
      logger.info(`Evento duplicado ignorado ${event.type}`, { eventId: event.eventId });
      return;
    }

    try {
      await RequestContext.runAsEvent(event, async () => {
        for (const handler of handlers) {
          await handler(event.payload, event);
        }
      });
    } catch (error) {
      // Se libera el reclamo para que el reintento del broker pueda procesarlo.
      await IdempotencyUtil.release(this.#serviceName, event.eventId);
      throw error;
    }
  }
}

// ─── Singleton por proceso ────────────────────────────────────────────────────

let instance = null;

module.exports = {
  EventBus,

  /** Inicializa el bus del proceso (lo hace BaseServer). */
  init(options = {}) {
    instance = new EventBus(options);
    return instance;
  },

  /** @returns {EventBus} */
  get() {
    if (!instance) {
      instance = new EventBus();
    }
    return instance;
  },

  /** Solo para tests. */
  reset() {
    instance = null;
  }
};
