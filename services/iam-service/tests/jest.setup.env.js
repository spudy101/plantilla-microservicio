// Entorno de test: SQLite en memoria, bus en memoria, sin Redis y claves RSA efímeras.
const { generateKeyPairSync } = require('node:crypto');

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});

process.env.NODE_ENV = 'test';
process.env.SERVICE_NAME = 'iam-service';
process.env.REDIS_ENABLED = 'false';
process.env.EVENT_BUS_DRIVER = 'memory';
process.env.WORKERS_ENABLED = 'false';
process.env.JWT_PRIVATE_KEY = privateKey;
process.env.JWT_PUBLIC_KEY = publicKey;
