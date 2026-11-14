// services/audit-service/src/docs/openapi.js — publicado en GET /docs

const bearer = [{ bearerAuth: [] }];
const text = name => ({ name, in: 'query', schema: { type: 'string' } });

module.exports = {
  openapi: '3.0.3',
  info: { title: 'audit-service', version: '1.0.0', description: 'Consulta del rastro de auditoría centralizado (audit:read)' },
  servers: [{ url: '/' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/api/v1/admin/audit-logs': {
      get: {
        tags: ['Auditoría'],
        summary: 'Buscar registros',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'] } },
          text('actorId'),
          text('action'),
          text('service'),
          { name: 'outcome', in: 'query', schema: { type: 'string', enum: ['success', 'failure'] } },
          text('entityType'),
          text('entityId'),
          text('correlationId'),
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date-time' } }
        ],
        responses: { 200: { description: 'OK' } }
      }
    },
    '/api/v1/admin/audit-logs/{auditId}': {
      get: {
        tags: ['Auditoría'],
        summary: 'Detalle',
        security: bearer,
        parameters: [{ name: 'auditId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' }, 404: { description: 'No existe' } }
      }
    }
  }
};
