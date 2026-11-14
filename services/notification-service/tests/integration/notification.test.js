const crypto = require('node:crypto');
const request = require('supertest');
const db = require('../../src/schemas');
const NotificationApp = require('../../src/app');
const { registerNotificationEventHandlers } = require('../../src/events');
const EmailProvider = require('../../src/providers/email.provider');
const IamClient = require('../../src/clients/iam.client');
const { EventBus } = require('@plantilla/shared/events/event-bus');
const MemoryAdapter = require('@plantilla/shared/events/adapters/memory.adapter');
const { EVENT_TYPES } = require('@plantilla/shared/constants/events');
const { ROLES } = require('@plantilla/shared/constants/rbac');
const { tokenFor } = require('../helpers/token.helper');

const app = new NotificationApp().getApp();
const sleep = ms => new Promise(r => {
    setTimeout(r, ms);
  });

describe('notification-service', () => {
  let consumer;
  let publisher;

  beforeAll(async () => {
    consumer = new EventBus({ serviceName: 'notification-service', adapter: new MemoryAdapter() });
    registerNotificationEventHandlers(consumer);
    await consumer.start();
    publisher = new EventBus({ serviceName: 'iam-service', adapter: new MemoryAdapter() });
  });

  beforeEach(() => db.sequelize.sync({ force: true }));
  afterAll(async () => {
    await consumer.stop();
    await db.sequelize.close();
  });

  it('bienvenida: crea la in-app y envía el email sin consultar a iam', async () => {
    const sendSpy = jest.spyOn(EmailProvider, 'send');
    const iamSpy = jest.spyOn(IamClient, 'getUserContact');
    const { token, userId } = await tokenFor(ROLES.CLIENT);

    await publisher.publish(EVENT_TYPES.USER_REGISTERED, { userId, email: 'ana@example.com', firstName: 'Ana', lastName: 'P' });
    await sleep(100);

    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@example.com' }));
    expect(iamSpy).not.toHaveBeenCalled();

    const inbox = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    expect(inbox.status).toBe(200);
    expect(inbox.body.data).toHaveLength(1);
    expect(inbox.body.data[0]).toMatchObject({ category: 'WELCOME', isRead: false });
  });

  it('alerta de reuse: resuelve el email vía iam-service', async () => {
    jest.spyOn(IamClient, 'getUserContact').mockResolvedValue({ email: 'ana@example.com' });
    const sendSpy = jest.spyOn(EmailProvider, 'send');
    const userId = crypto.randomUUID();

    await publisher.publish(EVENT_TYPES.SESSION_REVOKED, { userId, sessionId: crypto.randomUUID(), reason: 'REFRESH_TOKEN_REUSE' });
    await sleep(100);

    expect(IamClient.getUserContact).toHaveBeenCalledWith(userId);
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@example.com' }));
  });

  it('ignora revocaciones normales (logout)', async () => {
    const userId = crypto.randomUUID();
    await publisher.publish(EVENT_TYPES.SESSION_REVOKED, { userId, sessionId: crypto.randomUUID(), reason: 'LOGOUT' });
    await sleep(50);
    expect(await db.models.Notification.count({ where: { user_id: userId } })).toBe(0);
  });

  it('marcar como leída solo afecta notificaciones propias', async () => {
    const owner = await tokenFor(ROLES.CLIENT);
    const other = await tokenFor(ROLES.CLIENT);
    const n = await db.models.Notification.create({
      user_id: owner.userId,
      channel: 'IN_APP',
      title: 't',
      body: 'b',
      status: 'SENT'
    });

    const foreign = await request(app).patch(`/api/v1/notifications/${n.notification_id}/read`).set('Authorization', `Bearer ${other.token}`);
    expect(foreign.status).toBe(404);

    const own = await request(app).patch(`/api/v1/notifications/${n.notification_id}/read`).set('Authorization', `Bearer ${owner.token}`);
    expect(own.status).toBe(200);
    expect(own.body.data.isRead).toBe(true);

    const count = await request(app).get('/api/v1/notifications/unread-count').set('Authorization', `Bearer ${owner.token}`);
    expect(count.body.data.unread).toBe(0);
  });
});
