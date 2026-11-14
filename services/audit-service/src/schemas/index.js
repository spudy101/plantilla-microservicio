// services/audit-service/src/schemas/index.js — conexión + modelos del esquema `audit`

require('../config');
const path = require('node:path');
const { createDatabase } = require('@plantilla/shared/database/database.factory');
const { buildDatabaseConfig } = require('@plantilla/shared/config/database.config');

module.exports = createDatabase({
  config: buildDatabaseConfig('audit'),
  modelsDir: path.join(__dirname, 'models')
});
