const { EventBus } = require('../../src/events/event-bus');
const MemoryAdapter = require('../../src/events/adapters/memory.adapter');
const RequestContext = require('../../src/utils/request-context.util');

const flush = () => new Promise(resolve => setImmediate(resolve));

describe('EventBus (memory)', () => {
  let publisher;
  let consumer;

  beforeEach(() => {
    publisher = new EventBus({ serviceName: 'publisher', adapter: new MemoryAdapter() });
    consumer = new EventBus({ serviceName: 'consumer', adapter: new MemoryAdapter() });
  });

  afterEach(async () => {
    await consumer.stop();
  });

  it('entrega el payload al handler suscrito con el sobre completo', async () => {
    const handler = jest.fn();
    consumer.subscribe('test.thing.happened', handler);
    await consumer.start();

    const envelope = await publisher.publish('test.thing.happened', { id: 1 });
    await flush();
    await flush();

    expect(handler).toHaveBeenCalledWith({ id: 1 }, expect.objectContaining({ eventId: envelope.eventId, source: 'shared-tests' }));
  });

  it('propaga el correlationId del request que publicó', async () => {
    let seen = null;
    consumer.subscribe('test.trace', async () => {
      seen = RequestContext.get()?.correlationId;
    });
    await consumer.start();

    await RequestContext.run({ correlationId: 'req-abc' }, () => publisher.publish('test.trace', {}));
    await flush();
    await flush();

    expect(seen).toBe('req-abc');
  });

  it('ignora duplicados del mismo eventId (idempotencia)', async () => {
    const handler = jest.fn();
    consumer.subscribe('test.dup', handler);
    const adapter = new MemoryAdapter();
    const bus = new EventBus({ serviceName: 'dup-consumer', adapter });
    bus.subscribe('test.dup', handler);
    await bus.start();

    const event = { eventId: 'fixed-id', type: 'test.dup', payload: { n: 1 } };
    await adapter.publish(event);
    await adapter.publish(event);
    await flush();
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    await bus.stop();
  });

  it('no arranca a consumir si no hay handlers', async () => {
    const adapter = { start: jest.fn(), stop: jest.fn(), publish: jest.fn() };
    const bus = new EventBus({ serviceName: 'idle', adapter });
    await bus.start();
    expect(adapter.start).not.toHaveBeenCalled();
  });
});
