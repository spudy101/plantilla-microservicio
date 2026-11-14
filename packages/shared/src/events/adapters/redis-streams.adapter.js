// packages/shared/src/events/adapters/redis-streams.adapter.js
//
// Bus durable sobre Redis Streams (local / dev / ambientes sin AWS).
//
//   - Un stream único (EVENT_STREAM_NAME) con todos los eventos.
//   - Un consumer group POR SERVICIO: cada servicio recibe todos los eventos una
//     vez, y sus réplicas se reparten el trabajo.
//   - ACK solo si el handler terminó bien. Si falla, el mensaje queda pendiente y
//     se reintenta con XAUTOCLAIM. Tras MAX_ATTEMPTS va al stream `<stream>:dlq`.

const os = require('node:os');
const redisClient = require('../../utils/redis.util');
const { logger } = require('../../utils/logger.util');

const BLOCK_MS = 5000;
const BATCH_SIZE = 10;
const MAX_STREAM_LENGTH = 100000;
const RECLAIM_IDLE_MS = 60000;
const RECLAIM_EVERY_MS = 30000;
const MAX_ATTEMPTS = 5;
const ATTEMPTS_TTL_SECONDS = 86400;
const ERROR_BACKOFF_MS = 2000;

const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

class RedisStreamsAdapter {
  #stream;
  #group;
  #consumer;
  #reader = null;
  #running = false;
  #reclaimTimer = null;
  #onMessage = null;

  /**
   * @param {{ streamName: string, serviceName: string }} options
   */
  constructor({ streamName, serviceName }) {
    this.#stream = streamName;
    this.#group = serviceName;
    this.#consumer = `${serviceName}-${os.hostname()}-${process.pid}`;
  }

  async publish(envelope) {
    const client = redisClient.getClient();
    if (!client) {
      throw new Error('Redis no disponible: no se pudo publicar el evento');
    }
    await client.xadd(this.#stream, 'MAXLEN', '~', String(MAX_STREAM_LENGTH), '*', 'event', JSON.stringify(envelope));
  }

  async start(onMessage) {
    this.#onMessage = onMessage;
    this.#reader = redisClient.createConnection();
    await this.#reader.connect();

    try {
      await this.#reader.xgroup('CREATE', this.#stream, this.#group, '$', 'MKSTREAM');
    } catch (error) {
      if (!String(error.message).includes('BUSYGROUP')) {
        throw error;
      }
    }

    this.#running = true;
    this.#loop();
    this.#reclaimTimer = setInterval(() => {
      this.#reclaim().catch(error => logger.warn('Error en reclaim de eventos', { error: error.message }));
    }, RECLAIM_EVERY_MS);
    this.#reclaimTimer.unref();

    logger.info(`Consumiendo eventos de "${this.#stream}" como grupo "${this.#group}"`);
  }

  async stop() {
    this.#running = false;
    clearInterval(this.#reclaimTimer);
    if (this.#reader) {
      this.#reader.disconnect();
      this.#reader = null;
    }
    await sleep(0);
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  async #loop() {
    while (this.#running) {
      try {
        const result = await this.#reader.xreadgroup(
          'GROUP',
          this.#group,
          this.#consumer,
          'COUNT',
          BATCH_SIZE,
          'BLOCK',
          BLOCK_MS,
          'STREAMS',
          this.#stream,
          '>'
        );
        if (result) {
          const [[, entries]] = result;
          for (const [id, fields] of entries) {
            await this.#handle(id, fields);
          }
        }
      } catch (error) {
        if (!this.#running) {
          break;
        }
        logger.error('Error leyendo el stream de eventos', { error: error.message });
        await sleep(ERROR_BACKOFF_MS);
      }
    }
  }

  async #reclaim() {
    if (!this.#reader) {
      return;
    }
    const [, entries] = await this.#reader.xautoclaim(
      this.#stream,
      this.#group,
      this.#consumer,
      RECLAIM_IDLE_MS,
      '0-0',
      'COUNT',
      BATCH_SIZE
    );
    for (const [id, fields] of entries ?? []) {
      if (fields) {
        await this.#handle(id, fields);
      }
    }
  }

  async #handle(id, fields) {
    const raw = fields[fields.indexOf('event') + 1];
    let envelope = null;
    try {
      envelope = JSON.parse(raw);
      await this.#onMessage(envelope);
      await this.#reader.xack(this.#stream, this.#group, id);
    } catch (error) {
      await this.#registerFailure(id, raw, envelope, error);
    }
  }

  async #registerFailure(id, raw, envelope, error) {
    const attemptsKey = `events:attempts:${this.#group}:${id}`;
    const attempts = await this.#reader.incr(attemptsKey);
    await this.#reader.expire(attemptsKey, ATTEMPTS_TTL_SECONDS);

    logger.error('Falló el procesamiento de un evento', { id, type: envelope?.type, attempts, error: error.message });

    if (attempts >= MAX_ATTEMPTS) {
      await this.#reader.xadd(`${this.#stream}:dlq`, '*', 'event', raw ?? '', 'group', this.#group, 'error', error.message);
      await this.#reader.xack(this.#stream, this.#group, id);
      await this.#reader.del(attemptsKey);
      logger.error('Evento enviado a la dead-letter queue', { id, type: envelope?.type });
    }
  }
}

module.exports = RedisStreamsAdapter;
