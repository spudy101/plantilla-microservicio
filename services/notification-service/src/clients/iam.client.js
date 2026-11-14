// services/notification-service/src/clients/iam.client.js
//
// Llamada síncrona a iam-service (endpoint /internal). Se usa solo cuando el
// evento no trae el email (p.ej. alertas de seguridad): la fuente de verdad del
// email es iam y no se replica en este servicio.

const ServiceClient = require('@plantilla/shared/http/service-client.util');
const config = require('#config/index');

const client = new ServiceClient({ name: 'iam-service', baseUrl: config.services.iamUrl });

class IamClient {
  /** @returns {Promise<{ userId: string, email: string, role: string, status: string }>} */
  static getUserContact(userId) {
    return client.get(`/internal/v1/users/${encodeURIComponent(userId)}`);
  }
}

module.exports = IamClient;
