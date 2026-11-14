// services/notification-service/src/schemas/index.js — conexión + modelos del esquema `notification`

require('../config');
const path = require('node:path');
const { createDatabase } = require('@plantilla/shared/database/database.factory');
const { buildDatabaseConfig } = require('@plantilla/shared/config/database.config');

module.exports = createDatabase({
  config: buildDatabaseConfig('notification'),
  modelsDir: path.join(__dirname, 'models')
});
