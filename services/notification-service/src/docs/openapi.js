// services/notification-service/src/docs/openapi.js — publicado en GET /docs

const bearer = [{ bearerAuth: [] }];
const ok = { 200: { description: 'OK' } };
const idParam = [{ name: 'notificationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }];

module.exports = {
  openapi: '3.0.3',
  info: { title: 'notification-service', version: '1.0.0', description: 'Bandeja in-app y envío de emails' },
  servers: [{ url: '/' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/api/v1/notifications': {
      get: {
        tags: ['Bandeja'],
        summary: 'Mis notificaciones',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'unreadOnly', in: 'query', schema: { type: 'boolean' } }
        ],
        responses: ok
      }
    },
    '/api/v1/notifications/unread-count': {
      get: { tags: ['Bandeja'], summary: 'Contador de no leídas', security: bearer, responses: ok }
    },
    '/api/v1/notifications/read-all': {
      patch: { tags: ['Bandeja'], summary: 'Marcar todas como leídas', security: bearer, responses: ok }
    },
    '/api/v1/notifications/{notificationId}/read': {
      patch: { tags: ['Bandeja'], summary: 'Marcar como leída', security: bearer, parameters: idParam, responses: ok }
    },
    '/api/v1/admin/notifications': {
      post: {
        tags: ['Admin'],
        summary: 'Enviar notificación a un usuario (notifications:create)',
        security: bearer,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'title', 'body'],
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  title: { type: 'string' },
                  body: { type: 'string' },
                  channels: { type: 'array', items: { type: 'string', enum: ['IN_APP', 'EMAIL'] } }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Enviada' } }
      }
    }
  }
};
