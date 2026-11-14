// services/notification-service/src/modules/notifications/templates/notification.templates.js
//
// Textos por tipo de notificación. Centralizados para poder moverlos a BD o a
// un CMS sin tocar los handlers.

const { CATEGORIES } = require('#schemas/models/notification.model');

const NotificationTemplates = {
  welcome: ({ firstName }) => ({
    category: CATEGORIES.WELCOME,
    title: '¡Bienvenido!',
    body: `Hola ${firstName ?? ''}, tu cuenta fue creada correctamente.`.replace('  ', ' ')
  }),

  refreshTokenReuse: () => ({
    category: CATEGORIES.SECURITY,
    title: 'Cerramos una sesión por seguridad',
    body: 'Detectamos un uso sospechoso de tu sesión y la cerramos. Si no fuiste tú, cambia tu contraseña.'
  }),

  accountStatusChanged: ({ status }) => ({
    category: CATEGORIES.ACCOUNT,
    title: status === 'BLOCKED' ? 'Tu cuenta fue bloqueada' : 'Tu cuenta fue reactivada',
    body:
      status === 'BLOCKED'
        ? 'Un administrador bloqueó tu cuenta. Contacta a soporte para más información.'
        : 'Ya puedes volver a iniciar sesión.'
  })
};

module.exports = NotificationTemplates;
