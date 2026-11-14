// packages/shared/src/events/event-envelope.js
//
// Sobre ESTÁNDAR de todo evento que viaja por el bus. El payload es del dominio;
// el resto es metadata para trazabilidad e idempotencia.
//
// {
//   eventId:       uuid único → clave de idempotencia del consumidor
//   type:          'iam.user.registered' (ver constants/events.js)
//   version:       1 → subir si cambia el contrato de forma incompatible
//   source:        servicio que lo publicó
//   occurredAt:    ISO 8601
//   correlationId: el del request que lo originó (traza de punta a punta)
//   actorId:       usuario que disparó la acción (o null si fue el sistema)
//   payload:       datos del dominio
// }

const crypto = require('node:crypto');
const RequestContext = require('../utils/request-context.util');
const { server } = require('../config/env');

/**
 * @param {string} type
 * @param {Object} payload
 * @param {{ version?: number, actorId?: string|null }} [options]
 */
const buildEnvelope = (type, payload, options = {}) => {
  const ctx = RequestContext.getSafe();
  return {
    eventId: crypto.randomUUID(),
    type,
    version: options.version ?? 1,
    source: server.serviceName,
    occurredAt: new Date().toISOString(),
    correlationId: ctx.correlationId,
    actorId: options.actorId ?? ctx.userId ?? null,
    payload
  };
};

/**
 * Valida la forma mínima de un sobre recibido (los mensajes externos no son confiables).
 * @returns {boolean}
 */
const isValidEnvelope = event =>
  Boolean(event) &&
  typeof event === 'object' &&
  typeof event.eventId === 'string' &&
  typeof event.type === 'string' &&
  typeof event.payload === 'object' &&
  event.payload !== null;

module.exports = { buildEnvelope, isValidEnvelope };
