// services/iam-service/src/config/index.js
//
// SIEMPRE el primer require del servicio (server.js / app.js / tests):
// carga el .env del servicio antes de que @plantilla/shared lea process.env.

const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'iam-service';

const env = require('@plantilla/shared/config/env');

const { optional, toInt } = env.helpers;
const DEFAULT_PORT = 4001;

module.exports = {
  ...env,
  server: { ...env.server, port: toInt(optional('PORT'), DEFAULT_PORT) },
  auth: {
    bcryptRounds: toInt(optional('BCRYPT_ROUNDS'), env.server.isTest ? 4 : 12),
    maxFailedAttempts: toInt(optional('AUTH_MAX_FAILED_ATTEMPTS'), 5),
    lockMinutes: toInt(optional('AUTH_LOCK_MINUTES'), 15),
    // Tope ABSOLUTO de una sesión: el refresh rota pero nunca supera este límite.
    sessionMaxHours: toInt(optional('SESSION_MAX_HOURS'), 8),
    // Inactividad: si no se refresca en esta ventana, la sesión expira.
    sessionIdleMinutes: toInt(optional('SESSION_IDLE_MINUTES'), 30)
  },
  workers: {
    enabled: optional('WORKERS_ENABLED', 'true') === 'true',
    sessionCleanupEveryMinutes: toInt(optional('SESSION_CLEANUP_EVERY_MINUTES'), 5)
  }
};
