const request = require('supertest');
const db = require('../../src/schemas');
const AuditApp = require('../../src/app');
const { registerAuditEventHandlers } = require('../../src/events');
const { EventBus } = require('@plantilla/shared/events/event-bus');
const MemoryAdapter = require('@plantilla/shared/events/adapters/memory.adapter');
const { EVENT_TYPES } = require('@plantilla/shared/constants/events');
const { ROLES } = require('@plantilla/shared/constants/rbac');
const { tokenFor } = require('../helpers/token.helper');

const app = new AuditApp().getApp();
const sleep = ms => new Promise(r => {
    setTimeout(r, ms);
  });

const sampleRecord = (overrides = {}) => ({
  action: 'USER_LOGGED_IN',
  actorId: 'u-1',
  service: 'iam-service',
  outcome: 'success',
  correlationId: 'req-1',
  details: { sessionId: 's-1' },
  occurredAt: new Date().toISOString(),
  ...overrides
});

describe('audit-service', () => {
  beforeEach(() => db.sequelize.sync({ force: true }));
  afterAll(() => db.sequelize.close());

  it('persiste audit.log.recorded de otros servicios una sola vez por eventId', async () => {
    const adapter = new MemoryAdapter();
    const consumer = new EventBus({ serviceName: 'audit-service', adapter });
    registerAuditEventHandlers(consumer);
    await consumer.start();

    const event = { eventId: 'evt-1', type: EVENT_TYPES.AUDIT_RECORDED, payload: sampleRecord() };
    await adapter.publish(event);
    await adapter.publish(event);
    await sleep(50);

    expect(await db.models.AuditLog.count()).toBe(1);
    await consumer.stop();
  });

  it('un admin filtra por correlationId; un cliente recibe 403', async () => {
    const AuditLogService = require('../../src/modules/audit-logs/services/audit-log.service');
    await AuditLogService.record(sampleRecord({ correlationId: 'req-A' }), 'e-a');
    await AuditLogService.record(sampleRecord({ correlationId: 'req-B' }), 'e-b');

    const admin = await tokenFor(ROLES.ADMIN);
    const res = await request(app).get('/api/v1/admin/audit-logs?correlationId=req-A').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ action: 'USER_LOGGED_IN', correlationId: 'req-A' });

    const client = await tokenFor(ROLES.CLIENT);
    const forbidden = await request(app).get('/api/v1/admin/audit-logs').set('Authorization', `Bearer ${client.token}`);
    expect(forbidden.status).toBe(403);
  });
});
