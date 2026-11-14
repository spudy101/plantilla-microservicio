const request = require('supertest');
const GatewayApp = require('../../src/app');
const { resolveRoute } = require('../../src/routing/route-table');
const { ROLES } = require('@plantilla/shared/constants/rbac');
const { tokenFor } = require('../helpers/token.helper');

// Proxies falsos: responden qué servicio habría recibido el request.
const fakeProxy = service => (req, res) =>
  res.json({ service, path: req.originalUrl, userId: req.user?.userId ?? null, correlationId: req.correlationId });

const proxies = { iam: fakeProxy('iam'), person: fakeProxy('person'), notification: fakeProxy('notification'), audit: fakeProxy('audit') };
const app = new GatewayApp({ proxies }).getApp();

describe('route-table', () => {
  it('elige el prefijo más largo y detecta rutas públicas', () => {
    expect(resolveRoute('POST', '/api/v1/auth/login')).toMatchObject({ service: 'iam', isPublic: true });
    expect(resolveRoute('GET', '/api/v1/auth/me')).toMatchObject({ service: 'iam', isPublic: false });
    expect(resolveRoute('GET', '/api/v1/admin/persons/123')).toMatchObject({ service: 'person' });
    expect(resolveRoute('GET', '/api/v1/personsX')).toBeNull();
  });
});

describe('api-gateway', () => {
  it('deja pasar rutas públicas sin token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('iam');
  });

  it('exige token en rutas protegidas', async () => {
    const res = await request(app).get('/api/v1/persons/me');
    expect(res.status).toBe(401);
  });

  it('enruta con token válido y propaga el correlationId', async () => {
    const { token, userId } = await tokenFor(ROLES.CLIENT);
    const res = await request(app).get('/api/v1/persons/me').set('Authorization', `Bearer ${token}`).set('X-Correlation-Id', 'req-test-123');
    expect(res.body).toMatchObject({ service: 'person', path: '/api/v1/persons/me', userId, correlationId: 'req-test-123' });
    expect(res.headers['x-correlation-id']).toBe('req-test-123');
  });

  it('nunca expone /internal', async () => {
    const res = await request(app).get('/internal/v1/users/abc').set('X-Internal-Api-Key', 'test-internal-api-key');
    expect(res.status).toBe(404);
  });

  it('404 para rutas desconocidas', async () => {
    const res = await request(app).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
  });
});
