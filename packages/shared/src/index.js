// packages/shared/src/index.js
//
// Punto de entrada "barrel" para lo más usado. Para el resto, importar por ruta:
//   require('@plantilla/shared/utils/app-error.util')
//
// Preferir la importación por ruta en código de servicios (deja claro de qué
// capa viene cada cosa y evita cargar módulos que no se usan).

module.exports = {
  BaseApp: require('./base/base.app'),
  BaseServer: require('./base/base.server'),
  AppError: require('./utils/app-error.util'),
  ApiResponse: require('./utils/app-response.util'),
  EventBus: require('./events/event-bus'),
  ServiceClient: require('./http/service-client.util'),
  ...require('./constants/events'),
  ...require('./constants/rbac')
};
