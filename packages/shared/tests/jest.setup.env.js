// Variables dummy para que los tests corran sin .env ni servicios externos.
process.env.NODE_ENV = 'test';
process.env.SERVICE_NAME = 'shared-tests';
process.env.REDIS_ENABLED = 'false';
process.env.EVENT_BUS_DRIVER = 'memory';
