// services/api-gateway/src/config/index.js
//
// SIEMPRE el primer require: carga el .env antes que @plantilla/shared.

const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'api-gateway';

const env = require('@plantilla/shared/config/env');

const { optional, toInt } = env.helpers;
const DEFAULT_PORT = 4000;

module.exports = {
  ...env,
  server: { ...env.server, port: toInt(optional('PORT'), DEFAULT_PORT) },
  services: {
    iam: optional('IAM_SERVICE_URL', 'http://localhost:4001'),
    person: optional('PERSON_SERVICE_URL', 'http://localhost:4002'),
    notification: optional('NOTIFICATION_SERVICE_URL', 'http://localhost:4003'),
    audit: optional('AUDIT_SERVICE_URL', 'http://localhost:4004')
  },
  proxy: {
    timeoutMs: toInt(optional('PROXY_TIMEOUT_MS'), 15000),
    healthTimeoutMs: toInt(optional('HEALTH_TIMEOUT_MS'), 2000)
  },
  rateLimit: {
    windowMinutes: toInt(optional('RATE_LIMIT_WINDOW_MINUTES'), 15),
    max: toInt(optional('RATE_LIMIT_MAX'), 300),
    authMax: toInt(optional('RATE_LIMIT_AUTH_MAX'), 20)
  }
};
