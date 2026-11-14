const request = require('supertest');
const { db, resetDatabase } = require('../helpers/db.helper');
const IamApp = require('../../src/app');
const EventBusRegistry = require('@plantilla/shared/events/event-bus');
const { EVENT_TYPES } = require('@plantilla/shared/constants/events');

const app = new IamApp().getApp();
const credentials = { email: 'ana@example.com', password: 'Segura#2026x', firstName: 'Ana', lastName: 'Pérez' };

const register = () => request(app).post('/api/v1/auth/register').send(credentials);
const login = (password = credentials.password) => request(app).post('/api/v1/auth/login').send({ email: credentials.email, password });

describe('Flujo de autenticación (iam-service)', () => {
  beforeEach(resetDatabase);
  afterAll(() => db.sequelize.close());

  it('registra, publica iam.user.registered y no expone el hash de password', async () => {
    const publishSpy = jest.spyOn(EventBusRegistry.get(), 'publishSafe');

    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: credentials.email, role: { code: 'CLIENT' }, status: 'ACTIVE' });
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(publishSpy).toHaveBeenCalledWith(
      EVENT_TYPES.USER_REGISTERED,
      expect.objectContaining({ email: credentials.email, firstName: 'Ana' }),
      expect.any(Object)
    );
  });

  it('rechaza email duplicado con 409', async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(409);
  });

  it('valida la política de contraseña con 422 y detalle por campo', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ ...credentials, password: 'corta' });
    expect(res.status).toBe(422);
    expect(res.body.errors.some(e => e.field === 'password')).toBe(true);
  });

  it('login → me → refresh → logout', async () => {
    await register();

    const loginRes = await login();
    expect(loginRes.status).toBe(200);
    const { accessToken, refreshToken } = loginRes.body.data;

    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(credentials.email);

    const refreshed = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.refreshToken).not.toBe(refreshToken);

    const logout = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${refreshed.body.data.accessToken}`);
    expect(logout.status).toBe(200);

    // El access token de una sesión revocada deja de servir de inmediato.
    const afterLogout = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${refreshed.body.data.accessToken}`);
    expect(afterLogout.status).toBe(401);
  });

  it('detecta reutilización del refresh token y revoca la sesión', async () => {
    await register();
    const { refreshToken } = (await login()).body.data;

    const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(first.status).toBe(200);

    const reused = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(reused.status).toBe(401);

    // El refresh nuevo (legítimo) también queda inválido: la sesión entera se revocó.
    const legit = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: first.body.data.refreshToken });
    expect(legit.status).toBe(401);
  });

  it('responde lo mismo con email inexistente o password incorrecta y bloquea tras N fallos', async () => {
    await register();

    const unknown = await request(app).post('/api/v1/auth/login').send({ email: 'nadie@example.com', password: 'x' });
    const wrong = await login('Incorrecta#123');
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);

    for (let i = 0; i < 4; i++) {
      await login('Incorrecta#123');
    }
    const locked = await login();
    expect(locked.status).toBe(429);
  });

  it('un CLIENT no puede listar usuarios (RBAC)', async () => {
    await register();
    const { accessToken } = (await login()).body.data;
    const res = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it('los endpoints /internal exigen la API key interna', async () => {
    const res = await request(app).get('/internal/v1/users/00000000-0000-4000-8000-000000000000');
    expect(res.status).toBe(403);

    const ok = await request(app)
      .get('/internal/v1/users/00000000-0000-4000-8000-000000000000')
      .set('X-Internal-Api-Key', 'test-internal-api-key');
    expect(ok.status).toBe(404);
  });
});
