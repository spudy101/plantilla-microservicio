// packages/shared/src/utils/request-context.util.js
//
// AsyncLocalStorage propaga el contexto del request (correlationId, userId, ip…)
// por toda la cadena async, sin pasarlo como parámetro. También se usa al
// CONSUMIR un evento: el handler corre con el correlationId del evento original,
// así una acción se puede seguir de punta a punta entre servicios.

const { AsyncLocalStorage } = require('node:async_hooks');
const crypto = require('node:crypto');

const SHORT_ID_LENGTH = 8;
const storage = new AsyncLocalStorage();

const shortId = () => crypto.randomUUID().slice(0, SHORT_ID_LENGTH);

const buildInternalContext = (source, label, correlationId = null) => ({
  correlationId: correlationId ?? `${source}-${label}-${shortId()}`,
  userId: null,
  sessionId: null,
  ip: 'internal',
  userAgent: null,
  method: null,
  path: label,
  source
});

module.exports = {
  /** Corre fn dentro del contexto dado (lo llama audit-context.middleware). */
  run: (context, fn) => storage.run(context, fn),

  /** @returns {Object|undefined} contexto actual */
  get: () => storage.getStore(),

  /** Contexto actual o uno sintético (nunca undefined). */
  getSafe: () => storage.getStore() ?? buildInternalContext('unknown', 'no-context'),

  /** Actualiza campos del contexto actual (p.ej. userId tras autenticar). */
  assign: fields => {
    const store = storage.getStore();
    if (store) {
      Object.assign(store, fields);
    }
  },

  /** Ejecuta un handler de evento heredando el correlationId del evento. */
  runAsEvent: (event, fn) =>
    storage.run(
      {
        ...buildInternalContext('event', event.type, event.correlationId),
        userId: event.actorId ?? null,
        eventId: event.eventId
      },
      fn
    ),

  /** Ejecuta un ciclo de worker/cron con su propio correlationId. */
  runAsWorker: (label, fn) => storage.run(buildInternalContext('worker', label), fn),

  /** Ejecuta un proceso de sistema (bootstrap, callbacks de infraestructura). */
  runAsSystem: (label, fn) => storage.run(buildInternalContext('system', label), fn)
};
