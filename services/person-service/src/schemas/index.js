// services/person-service/src/schemas/index.js — conexión + modelos del esquema `person`

require('../config');
const path = require('node:path');
const { createDatabase } = require('@plantilla/shared/database/database.factory');
const { buildDatabaseConfig } = require('@plantilla/shared/config/database.config');

module.exports = createDatabase({
  config: buildDatabaseConfig('person'),
  modelsDir: path.join(__dirname, 'models')
});
