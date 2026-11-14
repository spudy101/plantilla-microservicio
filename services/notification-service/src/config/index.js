// services/notification-service/src/config/index.js
//
// SIEMPRE el primer require del servicio: carga el .env antes que @plantilla/shared.

const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'notification-service';

const env = require('@plantilla/shared/config/env');

const { optional, toInt } = env.helpers;
const DEFAULT_PORT = 4003;

module.exports = {
  ...env,
  server: { ...env.server, port: toInt(optional('PORT'), DEFAULT_PORT) },
  email: {
    // console → solo loggea (dev/test) | ses → Amazon SES
    provider: optional('EMAIL_PROVIDER', 'console'),
    from: optional('EMAIL_FROM', 'no-reply@example.com'),
    sesRegion: optional('AWS_REGION', 'us-east-1')
  },
  services: {
    iamUrl: optional('IAM_SERVICE_URL', 'http://localhost:4001')
  }
};
