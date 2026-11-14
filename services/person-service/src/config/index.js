// services/person-service/src/config/index.js
//
// SIEMPRE el primer require del servicio: carga el .env antes que @plantilla/shared.

const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'person-service';

const env = require('@plantilla/shared/config/env');

const { optional, toInt } = env.helpers;
const DEFAULT_PORT = 4002;

module.exports = {
  ...env,
  server: { ...env.server, port: toInt(optional('PORT'), DEFAULT_PORT) }
};
