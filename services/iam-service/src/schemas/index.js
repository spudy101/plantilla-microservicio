// services/iam-service/src/schemas/index.js
//
// Capa de datos del servicio: conexión + modelos del esquema `iam`.
// Ningún otro servicio accede a estas tablas.

require('../config');
const path = require('node:path');
const { createDatabase } = require('@plantilla/shared/database/database.factory');
const { buildDatabaseConfig } = require('@plantilla/shared/config/database.config');

module.exports = createDatabase({
  config: buildDatabaseConfig('iam'),
  modelsDir: path.join(__dirname, 'models')
});
