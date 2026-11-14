const crypto = require('node:crypto');
const request = require('supertest');
const db = require('../../src/schemas');
const PersonApp = require('../../src/app');
const { registerPersonEventHandlers } = require('../../src/events');
const { EventBus } = require('@plantilla/shared/events/event-bus');
const MemoryAdapter = require('@plantilla/shared/events/adapters/memory.adapter');
const { EVENT_TYPES } = require('@plantilla/shared/constants/events');
const { ROLES } = require('@plantilla/shared/constants/rbac');
const { tokenFor } = require('../helpers/token.helper');

const app = new PersonApp().getApp();
const waitFor = async (fn, tries = 20) => {
  for (let i = 0; i < tries; i++) {
    const value = await fn();
    if (value) {
      return value;
    }
    await new Promise(r => setTimeout(r, 25));
  }
  return null;
};

describe('person-service', () => {
  beforeEach(() => db.sequelize.sync({ force: true }));
  afterAll(() => db.sequelize.close());

  it('crea el perfil al consumir iam.user.registered (y es idempotente)', async () => {
    const consumer = new EventBus({ serviceName: 'person-service', adapter: new MemoryAdapter() });
    registerPersonEventHandlers(consumer);
    await consumer.start();
    const iam = new EventBus({ serviceName: 'iam-service', adapter: new MemoryAdapter() });

    const userId = crypto.randomUUID();
    const payload = { userId, email: 'x@example.com', firstName: 'Ana', lastName: 'Pérez' };
    await iam.publish(EVENT_TYPES.USER_REGISTERED, payload);
    await iam.publish(EVENT_TYPES.USER_REGISTERED, payload); // otro eventId, mismo usuario

    const person = await waitFor(() => db.models.Person.findOne({ where: { user_id: userId } }));
    expect(person.first_name).toBe('Ana');
    await new Promise(r => setTimeout(r, 50));
    expect(await db.models.Person.count({ where: { user_id: userId } })).toBe(1);

    await consumer.stop();
  });

  it('PUT /me cifra la PII y GET /me la devuelve completa al dueño', async () => {
    const { token, userId } = await tokenFor(ROLES.CLIENT);

    const put = await request(app)
      .put('/api/v1/persons/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Ana', lastName: 'Pérez', nationalId: '12345678', phone: '+56912345678' });
    expect(put.status).toBe(200);

    const row = await db.models.Person.findOne({ where: { user_id: userId } });
    expect(row.national_id_encrypted).not.toContain('12345678');

    const me = await request(app).get('/api/v1/persons/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.data).toMatchObject({ nationalId: '12345678', phone: '+56912345678' });
  });

  it('el admin ve la PII enmascarada; el cliente no accede al listado', async () => {
    const client = await tokenFor(ROLES.CLIENT);
    await request(app)
      .put('/api/v1/persons/me')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ firstName: 'Ana', lastName: 'Pérez', nationalId: '12345678' });

    const admin = await tokenFor(ROLES.ADMIN);
    const list = await request(app).get('/api/v1/admin/persons').set('Authorization', `Bearer ${admin.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data[0].nationalId).toBe('****5678');
    expect(list.body.metadata.totalItems).toBe(1);

    const forbidden = await request(app).get('/api/v1/admin/persons').set('Authorization', `Bearer ${client.token}`);
    expect(forbidden.status).toBe(403);
  });

  it('rechaza un documento ya usado por otra persona', async () => {
    const a = await tokenFor();
    const b = await tokenFor();
    const body = { firstName: 'Ana', lastName: 'Pérez', nationalId: '99999999' };
    await request(app).put('/api/v1/persons/me').set('Authorization', `Bearer ${a.token}`).send(body);
    const res = await request(app).put('/api/v1/persons/me').set('Authorization', `Bearer ${b.token}`).send(body);
    expect(res.status).toBe(409);
  });

  it('sin token responde 401', async () => {
    const res = await request(app).get('/api/v1/persons/me');
    expect(res.status).toBe(401);
  });
});
