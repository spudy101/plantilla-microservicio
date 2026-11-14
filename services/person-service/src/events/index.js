// services/person-service/src/events/index.js
//
// Eventos que CONSUME este servicio. Un handler por evento, delgado: valida lo
// mínimo y delega en el service. Si lanza, el bus reintenta.

const { EVENT_TYPES } = require('@plantilla/shared/constants/events');
const PersonService = require('#modules/persons/services/person.service');

const registerPersonEventHandlers = bus => {
  bus.subscribe(EVENT_TYPES.USER_REGISTERED, async payload => {
    if (!payload.userId || !payload.firstName || !payload.lastName) {
      return; // evento incompleto: no reintentar algo que nunca va a funcionar
    }
    await PersonService.createFromRegistration(payload);
  });
};

module.exports = { registerPersonEventHandlers };
