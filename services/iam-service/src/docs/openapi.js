// services/iam-service/src/docs/openapi.js — publicado en GET /docs

const bearer = [{ bearerAuth: [] }];
const ok = { 200: { description: 'OK' } };

module.exports = {
  openapi: '3.0.3',
  info: { title: 'iam-service', version: '1.0.0', description: 'Identidad, sesiones y administración de usuarios' },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 10 },
          firstName: { type: 'string' },
          lastName: { type: 'string' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } }
      },
      RefreshRequest: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
      StatusRequest: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['ACTIVE', 'BLOCKED'] }, reason: { type: 'string' } }
      }
    }
  },
  paths: {
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registro de cliente',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: { 201: { description: 'Creado' }, 409: { description: 'Email ya registrado' } }
      }
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (access + refresh)',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          ...ok,
          401: { description: 'Credenciales inválidas' },
          429: { description: 'Cuenta bloqueada temporalmente' }
        }
      }
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotar refresh token',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } } },
        responses: { ...ok, 401: { description: 'Refresh inválido o reutilizado' } }
      }
    },
    '/api/v1/auth/logout': { post: { tags: ['Auth'], summary: 'Cerrar sesión', security: bearer, responses: ok } },
    '/api/v1/auth/me': { get: { tags: ['Auth'], summary: 'Usuario actual', security: bearer, responses: ok } },
    '/api/v1/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Listar usuarios (users:read)',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'BLOCKED'] } },
          { name: 'roleId', in: 'query', schema: { type: 'string', format: 'uuid' } }
        ],
        responses: ok
      }
    },
    '/api/v1/admin/users/{userId}': {
      get: {
        tags: ['Admin'],
        summary: 'Detalle de usuario (users:read)',
        security: bearer,
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: ok
      }
    },
    '/api/v1/admin/users/{userId}/status': {
      patch: {
        tags: ['Admin'],
        summary: 'Bloquear / activar (users:update) — bloquear revoca sus sesiones',
        security: bearer,
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusRequest' } } } },
        responses: ok
      }
    },
    '/api/v1/admin/roles': { get: { tags: ['Admin'], summary: 'Roles (roles:read)', security: bearer, responses: ok } }
  }
};
