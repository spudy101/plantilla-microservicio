// services/person-service/src/docs/openapi.js — publicado en GET /docs

const bearer = [{ bearerAuth: [] }];
const ok = { 200: { description: 'OK' } };

module.exports = {
  openapi: '3.0.3',
  info: { title: 'person-service', version: '1.0.0', description: 'Perfil personal (PII cifrada)' },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      UpdateProfile: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          nationalId: { type: 'string', nullable: true },
          phone: { type: 'string', example: '+56912345678', nullable: true },
          birthDate: { type: 'string', format: 'date', nullable: true }
        }
      }
    }
  },
  paths: {
    '/api/v1/persons/me': {
      get: { tags: ['Perfil'], summary: 'Mi perfil', security: bearer, responses: { ...ok, 404: { description: 'Sin perfil' } } },
      put: {
        tags: ['Perfil'],
        summary: 'Crear/actualizar mi perfil',
        security: bearer,
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProfile' } } } },
        responses: { ...ok, 409: { description: 'Documento ya registrado' } }
      }
    },
    '/api/v1/admin/persons': {
      get: {
        tags: ['Admin'],
        summary: 'Listar personas (persons:read) — PII enmascarada',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: ok
      }
    },
    '/api/v1/admin/persons/{personId}': {
      get: {
        tags: ['Admin'],
        summary: 'Detalle de persona (persons:read)',
        security: bearer,
        parameters: [{ name: 'personId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: ok
      }
    }
  }
};
