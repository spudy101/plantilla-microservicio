// services/notification-service/src/events/index.js
//
// Eventos que CONSUME este servicio. El eventId del sobre se pasa como
// sourceEventId para que una reentrega no duplique notificaciones.

const { EVENT_TYPES } = require('@plantilla/shared/constants/events');
const NotificationService = require('#modules/notifications/services/notification.service');
const NotificationTemplates = require('#modules/notifications/templates/notification.templates');
const { CHANNELS } = require('#schemas/models/notification.model');

const BOTH = [CHANNELS.IN_APP, CHANNELS.EMAIL];

const registerNotificationEventHandlers = bus => {
  // Bienvenida: el evento ya trae el email → no hace falta llamar a iam.
  bus.subscribe(EVENT_TYPES.USER_REGISTERED, (payload, event) =>
    NotificationService.notify({
      userId: payload.userId,
      content: NotificationTemplates.welcome(payload),
      channels: BOTH,
      email: payload.email,
      sourceEventId: event.eventId
    })
  );

  // Alerta de seguridad solo cuando la sesión se revocó por reutilización del refresh.
  bus.subscribe(EVENT_TYPES.SESSION_REVOKED, async (payload, event) => {
    if (payload.reason !== 'REFRESH_TOKEN_REUSE') {
      return;
    }
    await NotificationService.notify({
      userId: payload.userId,
      content: NotificationTemplates.refreshTokenReuse(),
      channels: BOTH, // el email se resuelve vía iam-service (/internal)
      sourceEventId: event.eventId
    });
  });

  bus.subscribe(EVENT_TYPES.USER_STATUS_CHANGED, (payload, event) =>
    NotificationService.notify({
      userId: payload.userId,
      content: NotificationTemplates.accountStatusChanged(payload),
      channels: [CHANNELS.IN_APP],
      sourceEventId: event.eventId
    })
  );

  // Cualquier servicio puede pedir una notificación publicando este evento.
  bus.subscribe(EVENT_TYPES.NOTIFICATION_REQUESTED, (payload, event) =>
    NotificationService.notify({
      userId: payload.userId,
      content: { category: payload.category ?? 'GENERAL', title: payload.title, body: payload.body },
      channels: payload.channels ?? [CHANNELS.IN_APP],
      data: payload.data ?? null,
      sourceEventId: event.eventId
    })
  );
};

module.exports = { registerNotificationEventHandlers };
