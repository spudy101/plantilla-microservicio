// packages/shared/src/events/adapters/memory.adapter.js
//
// Bus en memoria del proceso. Para tests y para correr varios "servicios" en un
// solo proceso. NO es durable: si el proceso muere, los eventos se pierden.

const { EventEmitter } = require('node:events');
const { logger } = require('../../utils/logger.util');

const CHANNEL = 'event';
// Compartido entre todas las instancias del proceso (simula un broker).
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

class MemoryAdapter {
  #listener = null;

  // eslint-disable-next-line class-methods-use-this, require-await
  async publish(envelope) {
    // Asíncrono como un broker real: el publicador no espera a los consumidores.
    setImmediate(() => emitter.emit(CHANNEL, envelope));
  }

  // eslint-disable-next-line require-await
  async start(onMessage) {
    this.#listener = envelope => {
      Promise.resolve(onMessage(envelope)).catch(error =>
        logger.error('Error procesando evento (memory bus)', { type: envelope.type, error: error.message })
      );
    };
    emitter.on(CHANNEL, this.#listener);
  }

  // eslint-disable-next-line require-await
  async stop() {
    if (this.#listener) {
      emitter.off(CHANNEL, this.#listener);
      this.#listener = null;
    }
  }
}

module.exports = MemoryAdapter;
