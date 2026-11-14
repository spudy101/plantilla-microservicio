// packages/shared/src/config/env.js
//
// Configuración COMÚN a todos los servicios. Único lugar (junto con el config/
// de cada servicio) donde se lee process.env — el resto del código consume este
// objeto. Fail-fast: si falta una variable obligatoria el proceso no arranca.
//
// Cada servicio carga su propio .env ANTES de requerir este módulo
// (ver services/*/src/config/index.js).

const DEFAULT_PORT = 4000;
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_ACCESS_TOKEN_TTL = 900; // 15 min

const nodeEnv = process.env.NODE_ENV || 'development';
const isTest = nodeEnv === 'test';

/**
 * Lee una variable obligatoria. En test devuelve el fallback para no exigir .env.
 * @param {string} name
 * @param {string} [testFallback]
 * @returns {string}
 */
const required = (name, testFallback = '') => {
  const value = process.env[name];
  if (value !== undefined && value !== '') {
    return value;
  }
  if (isTest) {
    return testFallback;
  }
  throw new Error(`[config] Variable de entorno obligatoria no definida: ${name}`);
};

const optional = (name, fallback = undefined) => {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value).toLowerCase() === 'true';
};

// Las claves PEM se guardan en .env con "\n" literales.
const pem = value => (value ? value.replaceAll(String.raw`\n`, '\n') : value);

const env = {
  helpers: { required, optional, toInt, toBool, pem },

  server: {
    nodeEnv,
    isTest,
    serviceName: optional('SERVICE_NAME', 'unknown-service'),
    isProduction: nodeEnv === 'production',
    host: optional('HOST', '0.0.0.0'),
    port: toInt(optional('PORT'), DEFAULT_PORT),
    logLevel: optional('LOG_LEVEL', isTest ? 'error' : 'info'),
    corsOrigins: optional('CORS_ORIGINS', '*')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean)
  },

  redis: {
    enabled: toBool(optional('REDIS_ENABLED'), !isTest),
    host: optional('REDIS_HOST', 'localhost'),
    port: toInt(optional('REDIS_PORT'), DEFAULT_REDIS_PORT),
    password: optional('REDIS_PASSWORD'),
    tls: toBool(optional('REDIS_TLS'), false)
  },

  jwt: {
    // Todos los servicios VERIFICAN con la pública; solo iam-service FIRMA con la privada.
    publicKey: pem(optional('JWT_PUBLIC_KEY')),
    privateKey: pem(optional('JWT_PRIVATE_KEY')),
    issuer: optional('JWT_ISSUER', 'plantilla-iam'),
    audience: optional('JWT_AUDIENCE', 'plantilla-api'),
    accessTokenTtl: toInt(optional('JWT_ACCESS_TOKEN_TTL'), DEFAULT_ACCESS_TOKEN_TTL)
  },

  crypto: {
    // Solo los servicios que guardan PII los necesitan (iam, person). Se validan al primer uso.
    aesKey: optional('AES_KEY', isTest ? 'a'.repeat(64) : undefined), // 32 bytes en hex
    hashPepper: optional('HASH_PEPPER', isTest ? 'test-pepper-test-pepper-test-pepper' : undefined)
  },

  internal: {
    // Llave compartida para llamadas servicio → servicio (header X-Internal-Api-Key).
    apiKey: required('INTERNAL_API_KEY', 'test-internal-api-key')
  },

  events: {
    // memory (tests / un solo proceso) | redis-streams (local/dev) | sns-sqs (AWS)
    driver: optional('EVENT_BUS_DRIVER', isTest ? 'memory' : 'redis-streams'),
    streamName: optional('EVENT_STREAM_NAME', 'plantilla:events'),
    awsRegion: optional('AWS_REGION', 'us-east-1'),
    snsTopicArn: optional('EVENTS_SNS_TOPIC_ARN'),
    sqsQueueUrl: optional('EVENTS_SQS_QUEUE_URL'),
    awsEndpoint: optional('AWS_ENDPOINT') // LocalStack u otro endpoint compatible
  }
};

module.exports = env;
