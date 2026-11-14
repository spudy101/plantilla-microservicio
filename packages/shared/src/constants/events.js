// packages/shared/src/constants/events.js
//
// Catálogo ÚNICO de eventos de dominio. Convención: <servicio>.<entidad>.<verbo-en-pasado>
// Cada evento es un contrato público: agregar campos es compatible, quitar o
// renombrar NO (crear una versión nueva). Detalle: docs/events.md

const EVENT_TYPES = Object.freeze({
  // iam-service
  USER_REGISTERED: 'iam.user.registered',
  USER_LOGGED_IN: 'iam.user.logged-in',
  USER_STATUS_CHANGED: 'iam.user.status-changed',
  SESSION_REVOKED: 'iam.session.revoked',

  // person-service
  PERSON_CREATED: 'person.person.created',
  PERSON_UPDATED: 'person.person.updated',

  // notification-service
  NOTIFICATION_REQUESTED: 'notification.notification.requested',

  // transversal — lo consume audit-service
  AUDIT_RECORDED: 'audit.log.recorded'
});

module.exports = { EVENT_TYPES };
